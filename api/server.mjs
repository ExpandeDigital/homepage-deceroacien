import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { Pool } from 'pg';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import fs from 'fs';
import path from 'path';

// Config
const PORT = process.env.PORT || 3001;
const BASE_PATH = process.env.BASE_PATH || '/api';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://deceroacien.app,https://www.deceroacien.app')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '';
const MP_INTEGRATOR_ID = process.env.MP_INTEGRATOR_ID || '';
const PUBLIC_API_BASE = process.env.PUBLIC_API_BASE || '';
const PUBLIC_SITE_BASE = process.env.PUBLIC_SITE_BASE || 'https://www.deceroacien.app';
const GRANT_SECRET = process.env.GRANT_SECRET || '';
// Parámetros de pago (configurables por entorno)
const MP_INSTALLMENTS = Number(process.env.MP_INSTALLMENTS || 6);
const _EXC = (process.env.MP_EXCLUDE_PAYMENT_METHODS ?? 'visa');
const MP_EXCLUDED_PAYMENT_METHODS = _EXC
  ? _EXC.split(',').map(s => s.trim()).filter(Boolean).map(id => ({ id }))
  : [];

// Inicializar Firebase Admin (usa credenciales del entorno)
try {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({ credential: admin.credential.cert(svc) });
      console.log('[api] Firebase Admin inicializado con service account JSON en variables.');
    } else {
      // Application Default Credentials (ADC), ideal para Cloud Run/Cloud Functions
      admin.initializeApp();
      console.log('[api] Firebase Admin inicializado con credenciales por defecto (ADC).');
    }
    console.log('[api] Firebase Admin inicializado');
  }
} catch (e) {
  console.error('[api] Error inicializando Firebase Admin:', e);
}

// Inicializar pool PG (opcional)
let pool = null;
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false } });
    console.log('[api] Pool PG inicializado');
  } catch (e) {
    console.error('[api] Error inicializando PG:', e);
  }
} else {
  console.warn('[api] DATABASE_URL no definido; endpoints responderán sin persistencia.');
}

// Helpers
function corsOptions(origin, callback) {
  if (!origin) return callback(null, { origin: true });
  if (ALLOWED_ORIGINS.includes(origin)) return callback(null, { origin: true });
  return callback(null, { origin: false });
}

async function verifyBearer(req) {
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  const idToken = m[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded;
  } catch (e) {
    console.warn('[api] verifyIdToken falló:', e?.errorInfo || e?.message || e);
    return null;
  }
}

// App
const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: false }));
// Asegurar preflight para cualquier ruta
app.options('*', cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// Health
app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Config pública (sin secretos): entrega Firebase web config y URLs
app.get('/api/public-config', (req, res) => {
  const firebase = {
    apiKey: process.env.PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.PUBLIC_FIREBASE_APP_ID || '',
    measurementId: process.env.PUBLIC_FIREBASE_MEASUREMENT_ID || ''
  };
  res.json({
    firebase,
    apiBase: PUBLIC_API_BASE || '',
    siteBase: PUBLIC_SITE_BASE || ''
  });
});

// Namespace API
const router = express.Router();

// POST /auth/verify: verifica token y provisiona usuario de forma idempotente
router.post('/auth/verify', async (req, res) => {
  const decoded = await verifyBearer(req);
  if (!decoded) return res.status(401).json({ error: 'invalid_token' });

  // Datos básicos del usuario desde Firebase
  const uid = decoded.uid;
  const email = decoded.email || null;
  const name = decoded.name || '';

  // Provisionar en DB si existe pool y tabla users
  if (pool) {
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE,
          first_name TEXT,
          last_name TEXT,
          firebase_uid TEXT UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );`
      );
      const [firstName, ...rest] = (name || '').split(' ');
      const lastName = rest.join(' ');
      await pool.query(
        `INSERT INTO users (id, email, first_name, last_name, firebase_uid)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, updated_at = now()`,
        [uid, email, firstName || null, lastName || null, uid]
      );
    } catch (e) {
      console.warn('[api] upsert users falló (continuamos):', e?.message || e);
    }
  }

  return res.status(204).send();
});

// GET /auth/me: devuelve user + enrollments según token
router.get('/auth/me', async (req, res) => {
  const decoded = await verifyBearer(req);
  if (!decoded) return res.status(401).json({ error: 'invalid_token' });

  let user = {
    id: decoded.uid,
    email: decoded.email || null,
    firebase_uid: decoded.uid,
    first_name: (decoded.name || '').split(' ')[0] || null,
    last_name: (decoded.name || '').split(' ').slice(1).join(' ') || null
  };
  let enrollments = [];

  if (pool) {
    try {
      const ures = await pool.query('SELECT id, email, first_name, last_name, firebase_uid FROM users WHERE id = $1 LIMIT 1', [decoded.uid]);
      if (ures.rows[0]) {
        user = ures.rows[0];
      }
    } catch (e) {
      console.warn('[api] select users falló (continuamos):', e?.message || e);
    }
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS enrollments (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          entitlement TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );`
      );
      const eres = await pool.query('SELECT entitlement FROM enrollments WHERE user_id = $1', [decoded.uid]);
      enrollments = eres.rows.map(r => r.entitlement);
    } catch (e) {
      console.warn('[api] select enrollments falló (continuamos):', e?.message || e);
    }
  }

  return res.json({ user, enrollments });
});

// ==============================
// Mercado Pago: configuración y endpoints
// ==============================
let mpClient = null;
let mpPreference = null;
let mpPayment = null;
if (MP_ACCESS_TOKEN) {
  try {
    mpClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    mpPreference = new Preference(mpClient);
    mpPayment = new Payment(mpClient);
    console.log('[api] Mercado Pago SDK inicializado');
  } catch (e) {
    console.warn('[api] No se pudo inicializar Mercado Pago SDK:', e?.message || e);
  }
} else {
  console.warn('[api] MP_ACCESS_TOKEN no definido; /mp/* limitado o inactivo.');
}

function buildNotificationUrl(req) {
  if (PUBLIC_API_BASE) return `${PUBLIC_API_BASE}${BASE_PATH}/mp/webhook`;
  // Fallback: derivar del request (puede no ser preciso detrás de proxies)
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}${BASE_PATH}/mp/webhook`;
}

function inferSiteBase(req, referer) {
  if (process.env.PUBLIC_SITE_BASE) return PUBLIC_SITE_BASE;
  try {
    const r = referer || '';
    if (!r) return PUBLIC_SITE_BASE;
    const u = new URL(r);
    return `${u.protocol}//${u.host}`;
  } catch {
    return PUBLIC_SITE_BASE;
  }
}

function mapItemToEntitlement(item) {
  // Dado un item, intenta deducir entitlement
  // Convención: item.metadata.entitlement o item.id/sku
  const mdEnt = (item && item.metadata && (item.metadata.entitlement || item.metadata.entitlements)) || null;
  if (mdEnt) return mdEnt;
  const id = (item && (item.id || item.sku || item.category_id)) || '';
  // Mapeo básico por id/sku
  const map = {
    'course.pmv': 'course.pmv',
    'course.pmf': 'course.pmf',
    'course.growth': 'course.growth',
    'course.ceo': 'course.ceo',
    'product.camino_dorado': 'product.camino_dorado',
    'product.deceroacien': 'product.deceroacien'
  };
  return map[id] || null;
}

async function grantEntitlements({ userId, email, entitlements = [] }) {
  if (!pool) return; // si no hay DB, no persistimos (visibilidad dependerá del cliente)
  if (!entitlements || !entitlements.length) return;
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS enrollments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        entitlement TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );`
    );
    let uid = userId || null;
    if (!uid && email) {
      // buscar user id por email
      try {
        const r = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
        if (r.rows[0]) uid = r.rows[0].id;
      } catch {}
    }
    if (!uid) return; // sin usuario no podemos asignar
    for (const ent of entitlements.flat()) {
      if (!ent) continue;
      const rowId = `enr_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      try {
        await pool.query('INSERT INTO enrollments (id, user_id, entitlement) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING', [rowId, uid, ent]);
      } catch {}
    }
  } catch (e) {
    console.warn('[api] grantEntitlements falló:', e?.message || e);
  }
}

// POST /mp/create-preference
router.post('/mp/create-preference', async (req, res) => {
  try {
    if (!mpPreference) return res.status(503).json({ error: 'mp_unavailable' });
    const { items = [], user = {}, returnTo = null, metadata = {} } = req.body || {};
    const referer = req.headers['referer'] || '';
    const siteBase = inferSiteBase(req, referer);
    const notificationUrl = buildNotificationUrl(req);
    // Preparar metadata consolidada
    const md = {
      user_id: user.id || null,
      email: user.email || null,
      entitlements: (items || []).map(it => mapItemToEntitlement(it)).filter(Boolean),
      ...metadata
    };
    // Cargar pricing.json para aceptar SKUs como strings
    let pricing = null;
    try {
      const pricingPath = path.join(process.cwd(), 'assets', 'config', 'pricing.json');
      const raw = fs.readFileSync(pricingPath, 'utf-8');
      pricing = JSON.parse(raw);
    } catch (e) {
      console.warn('[api] No se pudo leer assets/config/pricing.json:', e?.message || e);
    }

    const DEFAULT_DESC = 'Dispositivo de tienda móvil de comercio electrónico';
    const DEFAULT_IMG = `${PUBLIC_SITE_BASE}/assets/logo_de_cero_a_cien.png`;
    const itemsForPref = (items || []).map(it => {
      const isSku = typeof it === 'string';
      let sku = isSku ? it : (it.id || it.sku || null);
      let def = null;
      if (pricing && sku && pricing.products && pricing.products[sku]) {
        def = pricing.products[sku];
      }
      const title = (isSku && def?.title) || it.title || it.name || 'Producto';
      const unit_price = Number((isSku && def?.unit_price) || it.unit_price || it.price || 0);
      const currency_id = (pricing?.currency) || it.currency_id || 'CLP';
      return {
        title,
        description: it.description || DEFAULT_DESC,
        picture_url: it.picture_url || it.image || it.image_url || DEFAULT_IMG,
        quantity: Number(it.quantity || 1),
        currency_id,
        unit_price,
        id: (it.id && String(it.id)) || (it.sku && String(it.sku)) || '1234',
        category_id: it.category_id || undefined
      };
    });
    // Validación de productos: si vienen SKUs y no tenemos pricing, lo rechazamos; si vienen objetos completos, permitimos pasar
    if ((items || []).some(s => typeof s === 'string')) {
      if (!pricing || !pricing.products) {
        return res.status(400).json({ error: 'invalid_items', message: 'Se enviaron SKUs pero el servidor no tiene pricing.json; enviar ítems completos desde el frontend o incluir pricing.json' });
      }
      const invalid = (items || []).filter(s => typeof s === 'string' && !pricing.products[s]);
      if (invalid.length) {
        return res.status(400).json({ error: 'invalid_items', items: invalid });
      }
    }

    const prefBody = {
      items: itemsForPref,
      payer: user && user.email ? { email: user.email } : undefined,
      back_urls: {
        success: `${siteBase}/pago-id.html`,
        pending: `${siteBase}/pago-pendiente.html`,
        failure: `${siteBase}/pago-error.html`
      },
      auto_return: 'approved',
      notification_url: notificationUrl,
      payment_methods: {
        installments: MP_INSTALLMENTS,
        ...(MP_EXCLUDED_PAYMENT_METHODS.length ? { excluded_payment_methods: MP_EXCLUDED_PAYMENT_METHODS } : {})
      },
      external_reference: process.env.MP_CERT_EMAIL || (user && user.email) || undefined,
      metadata: md
    };
    let resp;
    let body;
    try {
      resp = await mpPreference.create({ body: prefBody, requestOptions: MP_INTEGRATOR_ID ? { headers: { 'x-integrator-id': MP_INTEGRATOR_ID } } : undefined });
      body = resp && resp.init_point ? resp : (resp?.body || resp);
    } catch (eCreate) {
      // Si falla por integrator/client id, reintentar sin header x-integrator-id
      const msg = (eCreate && (eCreate.message || eCreate.description || '')) + '';
      if (/client\.id unauthorized|unauthorized/i.test(msg)) {
        try {
          const r2 = await mpPreference.create({ body: prefBody });
          body = r2 && r2.init_point ? r2 : (r2?.body || r2);
        } catch (e2) {
          throw e2;
        }
      } else {
        throw eCreate;
      }
    }
    return res.json({
      id: body.id,
      init_point: body.init_point,
      sandbox_init_point: body.sandbox_init_point
    });
  } catch (e) {
    console.error('[api] mp/create-preference error:', e?.message || e);
    return res.status(500).json({ error: 'mp_error', message: e?.message || String(e) });
  }
});

// POST /mp/webhook
router.get('/mp/webhook', async (req, res) => {
  // Endpoint simple para verificación/challenge y debugging rápido
  res.status(200).json({ ok: true, method: 'GET', query: req.query || {} });
});
router.post('/mp/webhook', async (req, res) => {
  try {
    const topic = (req.query.type || req.body.type || '').toString();
    const id = (req.query['data.id'] || req.body?.data?.id || req.query.id || req.body.id || '').toString();
    if (!mpPayment || !id) { res.status(200).json({ ok: true }); return; }
    // Obtener pago y validar estado
    let payment = null;
    try {
      const p = await mpPayment.get({ id, requestOptions: MP_INTEGRATOR_ID ? { headers: { 'x-integrator-id': MP_INTEGRATOR_ID } } : undefined });
      payment = p?.body || p;
    } catch (e) {
      console.warn('[api] mp webhook get payment falló:', e?.message || e);
    }
    if (!payment) { res.status(200).json({ ok: true }); return; }
    if (payment.status === 'approved') {
      const md = payment.metadata || {};
      const userId = md.user_id || null;
      const email = md.email || (payment.payer && payment.payer.email) || null;
      const ents = md.entitlements || [];
      await grantEntitlements({ userId, email, entitlements: ents });
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[api] mp/webhook error:', e?.message || e);
    res.status(200).json({ ok: true }); // evitar reintentos agresivos
  }
});

// GET /mp/verify-grant?grant=...&t=...&ref=...&sig=...
import crypto from 'crypto';
router.get('/mp/verify-grant', async (req, res) => {
  try {
    const { grant, t, ref, sig } = req.query || {};
    if (!GRANT_SECRET) return res.json({ ok: false });
    if (!grant || !t || !sig) return res.json({ ok: false });
    // tolerancia 30 minutos
    const now = Date.now();
    const ts = Number(t);
    if (isNaN(ts) || Math.abs(now - ts) > 30 * 60 * 1000) return res.json({ ok: false });
    const toSign = `${grant}|${t}|${ref || ''}`;
    const h = crypto.createHmac('sha256', GRANT_SECRET).update(toSign).digest('hex');
    if (h !== sig) return res.json({ ok: false });
    return res.json({ ok: true });
  } catch (e) {
    return res.json({ ok: false });
  }
});

app.use(BASE_PATH, router);

// Endpoint de diagnóstico (opcional): inspeccionar preferencia por ID
router.get('/mp/debug-preference', async (req, res) => {
  try {
    if (!mpPreference) return res.status(503).json({ ok: false, error: 'mp_unavailable' });
    const prefId = req.query.pref_id || req.query.id;
    if (!prefId) return res.status(400).json({ ok: false, error: 'missing_pref_id' });
    try {
      const resp = await mpPreference.get({ preferenceId: String(prefId), requestOptions: MP_INTEGRATOR_ID ? { headers: { 'x-integrator-id': MP_INTEGRATOR_ID } } : undefined });
      const body = resp?.body || resp;
      return res.json({ ok: true, source: 'sdk', preference: body });
    } catch (sdkErr) {
      // Fallback REST para ver el error exacto
      try {
        const r = await fetch(`https://api.mercadopago.com/checkout/preferences/${encodeURIComponent(String(prefId))}`, {
          headers: {
            Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
            ...(MP_INTEGRATOR_ID ? { 'x-integrator-id': MP_INTEGRATOR_ID } : {})
          }
        });
        const body = await r.json();
        return res.status(r.ok ? 200 : 200).json({ ok: r.ok, source: 'rest', status: r.status, response: body });
      } catch (restErr) {
        return res.status(500).json({ ok: false, error: restErr?.message || String(restErr) });
      }
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// Diagnóstico: ¿quién es el vendedor según el MP_ACCESS_TOKEN?
router.get('/mp/debug-whoami', async (req, res) => {
  try {
    if (!MP_ACCESS_TOKEN) return res.status(200).json({ ok: false, error: 'no_token_configured' });
    const r = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        ...(MP_INTEGRATOR_ID ? { 'x-integrator-id': MP_INTEGRATOR_ID } : {})
      }
    });
    const body = await r.json();
    res.status(r.ok ? 200 : 200).json({ ok: r.ok, status: r.status, user: body });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`[api] listening on :${PORT} basePath=${BASE_PATH}`);
  console.log(`[api] allowed origins:`, ALLOWED_ORIGINS);
});
