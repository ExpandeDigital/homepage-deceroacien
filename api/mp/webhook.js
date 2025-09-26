// Vercel serverless function: POST /api/mp/webhook
// Recibe notificaciones de Mercado Pago y verifica pagos.
import crypto from 'crypto';
import { MercadoPagoConfig, Payment, MerchantOrder } from 'mercadopago';
import { upsertUserByFirebaseUID, findUserByEmail } from '../_lib/users.js';
import { grantEnrollment } from '../_lib/enrollments.js';
import { query } from '../_lib/db.js';
import { sendEmail } from '../_lib/mailer.js';
import { welcomeEmail, purchaseConfirmationEmail } from '../_lib/emailTemplates.js';
import { initFirebase } from '../_lib/firebaseAdmin.js';

// Log de salud del SDK (una sola vez por cold start)
let SDK_HEALTH_LOGGED = false;

export const config = {
  api: {
    bodyParser: false // Mercado Pago puede hacer reintentos con distintos headers; leemos como stream
  }
};

export default async function handler(req, res) {
  // Acepta GET (challenge) y POST
  if (req.method === 'GET') {
    return res.status(200).send('ok');
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Construir URL para leer query params (data.id y type) requeridos en validación de firma
    const fullUrl = new URL(req.url, process.env.MP_BASE_URL || 'https://deceroacien.app');
    const dataIdUrl = fullUrl.searchParams.get('data.id') || fullUrl.searchParams.get('id');
    const typeUrl = fullUrl.searchParams.get('type') || '';

    // Leer el cuerpo bruto (puede venir como query-string estilo x-www-form-urlencoded)
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks).toString('utf8');

    // Intentar parsear como JSON primero, si no como query string
    let payload = {};
    try { payload = JSON.parse(rawBody || '{}'); } catch (_) {
      payload = Object.fromEntries(new URLSearchParams(rawBody));
    }

  const topic = payload?.type || payload?.topic || typeUrl || '';
  const id = payload?.data?.id || payload?.id || payload?.['data.id'] || dataIdUrl;

    // Guardrails
    if (!topic || !id) {
      console.log('Webhook payload recibido, faltan campos:', { topic, id, rawBody });
      return res.status(200).json({ ok: true }); // Evitar reintentos infinitos
    }

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!ACCESS_TOKEN) return res.status(200).json({ ok: true });

    // Validación de firma (x-signature) si hay secreto configurado
    const secret = process.env.MP_WEBHOOK_SECRET;
    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];
    if (secret && xSignature) {
      try {
        const parts = String(xSignature).split(',').map((p) => p.trim());
        const tsPart = parts.find((p) => p.startsWith('ts='));
        const v1Part = parts.find((p) => p.startsWith('v1='));
        const ts = tsPart ? tsPart.split('=')[1] : null;
        const v1 = v1Part ? v1Part.split('=')[1] : null;

        // Construir manifest según doc: id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
        const manifestVals = [];
        if (id) manifestVals.push(`id:${id};`);
        if (xRequestId) manifestVals.push(`request-id:${xRequestId};`);
        if (ts) manifestVals.push(`ts:${ts};`);
        const manifest = manifestVals.join('');

        if (!v1 || !manifest) {
          console.warn('Webhook firma: faltan datos para validar', { id, xRequestId, tsPresent: !!ts });
        } else {
          const computed = crypto
            .createHmac('sha256', secret)
            .update(manifest)
            .digest('hex');
          if (computed !== v1) {
            console.warn('Webhook firma inválida', { manifest, v1, computed });
            return res.status(401).json({ ok: false });
          }
        }
      } catch (e) {
        console.error('Error validando firma de webhook:', e);
        return res.status(401).json({ ok: false });
      }
    }

    // Normalizar tópico y consultar recurso cuando aplique
    const t = String(topic || '').toLowerCase();
    let details = null;
    // Instanciar SDK oficial
    const mpClient = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
    const paymentsApi = new Payment(mpClient);
    const merchantOrderApi = new MerchantOrder(mpClient);
    // Cargar dinámicamente APIs opcionales si existen en la versión instalada del SDK
    let chargebackApi = null;
    let claimApi = null;
    try {
      const mod = await import('mercadopago');
      if (mod.Chargeback) chargebackApi = new mod.Chargeback(mpClient);
      if (mod.Claim) claimApi = new mod.Claim(mpClient);
    } catch (e) {
      // Si no existen esas clases en la versión del SDK, se usará REST como fallback más abajo
    }

    if (!SDK_HEALTH_LOGGED) {
      SDK_HEALTH_LOGGED = true;
      console.log('MP SDK health:', {
        hasPayment: !!paymentsApi,
        hasMerchantOrder: !!merchantOrderApi,
        hasChargeback: !!chargebackApi,
        hasClaim: !!claimApi
      });
    }
    try {
      if (t.includes('payment')) {
        // SDK oficial
        const resp = await paymentsApi.get({ id });
        details = resp;
      } else if (t.includes('merchant_order')) {
        // SDK oficial
        const resp = await merchantOrderApi.get({ merchantOrderId: id });
        details = resp;
      } else if (t.includes('charge')) { // contracargos
        try {
          if (chargebackApi && typeof chargebackApi.get === 'function') {
            details = await chargebackApi.get({ id });
          } else {
            console.warn('Chargebacks vía SDK no disponible en esta versión; sin fallback REST por política 100% SDK');
          }
        } catch (e) {
          console.warn('Error consultando contracargo vía SDK:', e?.message);
        }
      } else if (t.includes('reclamo') || t.includes('claim') || t.includes('dispute')) { // reclamos
        try {
          if (claimApi && typeof claimApi.get === 'function') {
            try {
              details = await claimApi.get({ id });
            } catch (e) {
              // Algunos SDKs podrían usar otro nombre de parámetro
              details = await claimApi.get({ claimId: id });
            }
          } else {
            console.warn('Claims vía SDK no disponible en esta versión; sin fallback REST por política 100% SDK');
          }
        } catch (e) {
          console.warn('Error consultando reclamo vía SDK:', e?.message);
        }
      } else if (t.includes('fraud')) {
        // Alertas de fraude: registrar payload; no siempre hay endpoint de detalle
      }
    } catch (e) {
      console.warn('No se pudo consultar detalles para tópico:', t, id, e?.message);
    }

    // Log básico (no exponer tokens)
    console.log('MP webhook:', { topic: t, id, action: payload?.action, live_mode: payload?.live_mode }, {
      status: details?.status,
      order_status: details?.order_status,
      reason: details?.reason || details?.motivo,
      metadata: details?.metadata,
      external_reference: details?.external_reference
    });

    // Ruteo de acciones
    if (t.includes('payment')) {
      if (details?.status === 'approved') {
        try {
          const entitlements = details?.metadata?.entitlements || [];
          const firebase_uid_meta = details?.metadata?.firebase_uid || null;
          const userEmail = (details?.payer?.email || details?.metadata?.userEmail || '').toLowerCase();
          if (entitlements.length > 0 && userEmail) {
            let userRecord = null;
            if (firebase_uid_meta) {
              // upsert directo por firebase uid
              userRecord = await upsertUserByFirebaseUID({ firebase_uid: firebase_uid_meta, email: userEmail });
            } else {
              // checkout invitado: buscar por email (puede no existir todavía)
              userRecord = await findUserByEmail(userEmail);
              if (!userRecord) {
                // Crear registro placeholder usando firebase_uid sintético pref_*
                const syntheticUid = `guest_${details.external_reference || 'ref'}_${Date.now()}`.slice(0,128);
                userRecord = await upsertUserByFirebaseUID({ firebase_uid: syntheticUid, email: userEmail });
                // (Opcional) Crear usuario en Firebase Auth para facilitar onboarding (si se configuró service account)
                try {
                  const admin = initFirebase();
                  if (admin) {
                    await admin.auth().getUserByEmail(userEmail).catch(async () => {
                      // crea firebase user sin password; el usuario podrá usar email link o set password luego
                      await admin.auth().createUser({ email: userEmail, emailVerified: true, disabled: false });
                    });
                  }
                } catch (e) {
                  console.warn('No se pudo crear/consultar usuario Firebase (opcional)', e.message);
                }
              }
            }
            // Otorgar cada entitlement
            for (const sku of entitlements) {
              try { await grantEnrollment(userRecord.id, sku, 'webhook_mp'); } catch (e) { /* ignore one-off */ }
            }
            // Registrar pago si no existe
            try {
              await query(`INSERT INTO payments (mp_payment_id, external_reference, user_id, payer_email, status, amount, currency, raw_payload)
                           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                           ON CONFLICT (mp_payment_id) DO NOTHING`, [
                String(details.id),
                details.external_reference || null,
                userRecord.id,
                userEmail,
                details.status,
                details.transaction_amount || null,
                details.currency_id || null,
                JSON.stringify(details)
              ]);
            } catch (e) {
              console.warn('No se pudo registrar pago (dup o error menor)', e.message);
            }

            // Emails transaccionales
            try {
              await sendEmail({ to: userEmail, ...purchaseConfirmationEmail({ email: userEmail, items: entitlements }) });
              if (!firebase_uid_meta) {
                await sendEmail({ to: userEmail, ...welcomeEmail({ email: userEmail }) });
              }
            } catch (e) {
              console.warn('Fallo envío email transaccional', e.message);
            }
          }
        } catch (grantErr) {
          console.error('Error otorgando entitlements desde webhook', grantErr);
        }
      }
    } else if (t.includes('charge')) {
      // Contracargo: podrías revertir o suspender entitlements y abrir un caso interno
      // TODO: implementar lógica de contracargo si se confirma
    } else if (t.includes('reclamo') || t.includes('claim') || t.includes('dispute')) {
      // Reclamo: notificar a soporte/comercial, asociar ID de reclamo a la orden/pago
      // TODO: implementar lógica de reclamos
    } else if (t.includes('fraud')) {
      // Alerta de fraude: elevar a revisión manual
      // TODO: implementar lógica de fraude
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('MP webhook error:', e);
    return res.status(200).json({ ok: true }); // Responder 200 para evitar reintentos agresivos
  }
}
