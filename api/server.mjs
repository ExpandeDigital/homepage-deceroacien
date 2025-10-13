import express from 'express';
import cors from 'cors';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Pool } from 'pg';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

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
// Supabase Auth (config pública + verificación)
const PUBLIC_SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const PUBLIC_SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY || '';
// Cuando Supabase emite tokens HS256 (por defecto), debemos verificar con el secreto del proyecto
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';
// JWKS remoto (derivado de la URL de Supabase)
const SUPABASE_JWKS_URL = PUBLIC_SUPABASE_URL ? `${PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json` : '';
let SUPABASE_JWKS = null;
if (SUPABASE_JWKS_URL) {
  try {
    SUPABASE_JWKS = createRemoteJWKSet(new URL(SUPABASE_JWKS_URL));
  } catch (e) {
    console.warn('[api] No se pudo inicializar JWKS de Supabase:', e?.message || e);
  }
}
// Parámetros de pago (configurables por entorno)
const MP_INSTALLMENTS = Number(process.env.MP_INSTALLMENTS || 6);
const _EXC = (process.env.MP_EXCLUDE_PAYMENT_METHODS ?? '');
const MP_EXCLUDED_PAYMENT_METHODS = _EXC
  ? _EXC.split(',').map(s => s.trim()).filter(Boolean).map(id => ({ id }))
  : [];
// Email (opcional)
const SMTP_URL = process.env.SMTP_URL || '';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@deceroacien.app';
const LEADS_NOTIFY_EMAIL = process.env.LEADS_NOTIFY_EMAIL || '';

// Firebase Admin eliminado: verificación y autenticación ahora son exclusivamente vía Supabase

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

async function ensureSchema() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS products (
        sku TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        price NUMERIC,
        currency TEXT DEFAULT 'CLP',
        metadata JSONB
      );
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        email TEXT,
        items JSONB NOT NULL,
        total NUMERIC,
        currency TEXT,
        preference_id TEXT,
        status TEXT, -- created|pending|paid|cancelled
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        status TEXT,
        amount NUMERIC,
        currency TEXT,
        method TEXT,
        raw JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS enrollments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        entitlement TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS webhook_events (
        id TEXT PRIMARY KEY,
        topic TEXT,
        resource_id TEXT,
        payload JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS processed_payments (
        payment_id TEXT PRIMARY KEY,
        processed_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        actor TEXT,
        action TEXT,
        target TEXT,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS download_leads (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        source TEXT NOT NULL DEFAULT 'descargas-gratuitas',
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS download_leads_email_source_idx ON download_leads (email, source);
    `);
    console.log('[api] Esquema aplicado/validado');
  } catch (e) {
    console.error('[api] Error aplicando esquema:', e?.message || e);
  }
}
ensureSchema().catch(()=>{});

// Helpers
function corsOptions(origin, callback) {
  if (!origin) return callback(null, { origin: true });
  if (ALLOWED_ORIGINS.includes(origin)) return callback(null, { origin: true });
  return callback(null, { origin: false });
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

async function verifyBearer(req) {
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  const token = m[1];
  
  // Detectar algoritmo del token
  let alg = null;
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
      alg = header && header.alg ? String(header.alg) : null;
    }
  } catch(_) {}
  
  const expectedIssuer = PUBLIC_SUPABASE_URL ? `${PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/auth/v1` : null;

  // Supabase usa HS256 incluso si el token tiene kid, así que intentamos HS256 primero
  if (alg === 'HS256' && SUPABASE_JWT_SECRET) {
    try {
      const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);
      let payload;
      try {
        ({ payload } = await jwtVerify(token, secret, { algorithms: ['HS256'], issuer: expectedIssuer, audience: 'authenticated' }));
      } catch (strictErr) {
        // Reintento sin restricciones estrictas
        ({ payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] }));
      }
      return {
        uid: payload.sub,
        email: payload.email || null,
        name: payload.user_metadata?.full_name || payload.name || null,
        provider_id: payload.provider_id || null,
        _supabase: payload
      };
    } catch (e) {
      console.warn('[api] Verificación HS256 falló:', e?.message || e);
    }
  }
  
  return null;
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

// Config pública (sin secretos) solo para Supabase y bases
app.get('/api/public-config', (req, res) => {
  const supabase = { url: PUBLIC_SUPABASE_URL || '', anonKey: PUBLIC_SUPABASE_ANON_KEY || '' };
  res.json({ supabase, apiBase: PUBLIC_API_BASE || '', siteBase: PUBLIC_SITE_BASE || '' });
});

// Namespace API
const router = express.Router();

// DEBUG: endpoint temporal para diagnosticar JWT (REMOVER EN PRODUCCIÓN)
router.post('/auth/debug-token', async (req, res) => {
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return res.json({ error: 'no_bearer_token', received_headers: Object.keys(req.headers) });
  
  const token = m[1];
  let tokenInfo = {};
  let verificationResult = null;
  
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      tokenInfo = {
        header,
        payload: {
          iss: payload.iss,
          aud: payload.aud,
          sub: payload.sub,
          exp: payload.exp,
          iat: payload.iat,
          email: payload.email
        }
      };
    }
  } catch(e) {
    tokenInfo.decode_error = e.message;
  }
  
  // Probar la verificación real
  try {
    verificationResult = await verifyBearer(req);
    console.log('[debug] verifyBearer result:', verificationResult);
  } catch(e) {
    verificationResult = { error: e.message };
    console.log('[debug] verifyBearer error:', e);
  }
  
  res.json({
    has_supabase_secret: !!SUPABASE_JWT_SECRET,
    has_supabase_jwks: !!SUPABASE_JWKS,
    supabase_url: PUBLIC_SUPABASE_URL || 'not_set',
    token_info: tokenInfo,
    verification_result: verificationResult
  });
});

// POST /auth/verify: verifica token y provisiona usuario de forma idempotente
router.post('/auth/verify', async (req, res) => {
  const decoded = await verifyBearer(req);
  if (!decoded) return res.status(401).json({ error: 'invalid_token' });

  // Datos básicos del usuario (Supabase)
  const uid = decoded.uid || decoded.user_id || decoded.sub;
  const email = decoded.email || null;
  const name = decoded.name || decoded._supabase?.user_metadata?.full_name || '';

  // Provisionar en DB si existe pool y tabla users
  if (pool) {
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE,
            first_name TEXT,
            last_name TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );`
      );
      const [firstName, ...rest] = (name || '').split(' ');
      const lastName = rest.join(' ');
      await pool.query(
        `INSERT INTO users (id, email, first_name, last_name)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, updated_at = now()`,
        [uid, email, firstName || null, lastName || null]
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

  const idClaim = decoded.uid || decoded.user_id || decoded.sub;
  let user = {
    id: idClaim,
    email: decoded.email || null,
    first_name: (decoded.name || decoded._supabase?.user_metadata?.full_name || '').split(' ')[0] || null,
    last_name: (decoded.name || decoded._supabase?.user_metadata?.full_name || '').split(' ').slice(1).join(' ') || null
  };
  let enrollments = [];

  if (pool) {
    try {
  const ures = await pool.query('SELECT id, email, first_name, last_name FROM users WHERE id = $1 LIMIT 1', [idClaim]);
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
      const eres = await pool.query('SELECT entitlement FROM enrollments WHERE user_id = $1', [idClaim]);
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
    await ensureSchema();
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

async function sendEmail({ to, subject, html }) {
  if (!SMTP_URL && !SMTP_HOST) return false;
  try {
    const transporter = SMTP_URL
      ? nodemailer.createTransport(SMTP_URL)
      : nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_SECURE,
          auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
        });
    await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
    return true;
  } catch (e) {
    console.warn('[api] sendEmail fallo:', e?.message || e);
    return false;
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function persistDownloadLead({ email, name, source, tags, metadata }) {
  if (!pool) {
    try {
      const dir = path.join(process.cwd(), 'api', '_tmp');
      fs.mkdirSync(dir, { recursive: true });
      const payload = {
        id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        email,
        name: name || null,
        source: source || 'descargas-gratuitas',
        tags: Array.isArray(tags) ? tags : null,
        metadata: metadata || null,
        stored_at: new Date().toISOString(),
        storage: 'file'
      };
      fs.appendFileSync(path.join(dir, 'download-leads.ndjson'), JSON.stringify(payload) + '\n', 'utf-8');
      return { stored: false, fallback: 'file' };
    } catch (e) {
      console.warn('[api] persistDownloadLead fallback file error:', e?.message || e);
      return { stored: false, reason: 'no_database' };
    }
  }

  try {
    await ensureSchema();
    const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tagsArray = Array.isArray(tags)
      ? tags.map(t => String(t || '').trim()).filter(Boolean)
      : [];
    const metadataJson = metadata && typeof metadata === 'object' ? metadata : {};
    const res = await pool.query(
      `INSERT INTO download_leads (id, email, name, source, tags, metadata)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       ON CONFLICT (email, source) DO UPDATE
         SET name = COALESCE(EXCLUDED.name, download_leads.name),
             tags = CASE
               WHEN EXCLUDED.tags IS NULL OR array_length(EXCLUDED.tags, 1) IS NULL OR array_length(EXCLUDED.tags, 1) = 0
                 THEN download_leads.tags
               ELSE EXCLUDED.tags
             END,
             metadata = COALESCE(download_leads.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb),
             updated_at = now()
       RETURNING id;`,
      [
        id,
        email,
        name || null,
        source || 'descargas-gratuitas',
  tagsArray,
        JSON.stringify(metadataJson)
      ]
    );
    return { stored: true, id: res.rows[0]?.id || id };
  } catch (e) {
    console.warn('[api] persistDownloadLead falló:', e?.message || e);
    return { stored: false, reason: e?.message || 'db_error' };
  }
}

router.post('/leads/downloads', async (req, res) => {
  try {
    const body = req.body || {};
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
    if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
      return res.status(400).json({ error: 'invalid_email' });
    }

    const email = rawEmail.toLowerCase();
    const name = typeof body.name === 'string' ? body.name.trim() || null : null;
    const source = typeof body.source === 'string' && body.source.trim()
      ? body.source.trim().toLowerCase()
      : 'descargas-gratuitas';
    const tags = Array.isArray(body.tags)
      ? body.tags.map(tag => String(tag || '').trim()).filter(Boolean)
      : [];
    const consent = (body.consent && typeof body.consent === 'object') ? body.consent : null;

    const metadata = (body.metadata && typeof body.metadata === 'object') ? { ...body.metadata } : {};
    if (body.asset && typeof body.asset === 'string') {
      metadata.asset = body.asset;
    }
    if (body.context && typeof body.context === 'object') {
      metadata.context = body.context;
    }
    if (body.formId && typeof body.formId === 'string') {
      metadata.formId = body.formId;
    }
    if (body.formVariant && typeof body.formVariant === 'string') {
      metadata.formVariant = body.formVariant;
    }
    metadata.page = metadata.page || body.page || null;
    metadata.referer = req.headers['referer'] || null;
    metadata.ip = ((req.headers['x-forwarded-for'] || '').split(',')[0] || '').trim() || req.socket?.remoteAddress || null;
    metadata.userAgent = req.headers['user-agent'] || null;
    if (consent) {
      metadata.consent = consent;
    }

    const stored = await persistDownloadLead({ email, name, source, tags, metadata });

    let notified = false;
    if (LEADS_NOTIFY_EMAIL) {
      const createdAt = new Date().toISOString();
      const html = `
        <h2>Nuevo lead de descargas</h2>
        <ul>
          <li><strong>Email:</strong> ${escapeHtml(email)}</li>
          <li><strong>Nombre:</strong> ${escapeHtml(name || '—')}</li>
          <li><strong>Origen:</strong> ${escapeHtml(source)}</li>
          <li><strong>Tags:</strong> ${escapeHtml(tags.join(', ') || '—')}</li>
          <li><strong>Registrado:</strong> ${escapeHtml(createdAt)}</li>
        </ul>
        <pre style="background:#f5f5f5;padding:12px;border-radius:8px;white-space:pre-wrap;word-break:break-word;">
${escapeHtml(JSON.stringify(metadata, null, 2))}
        </pre>
      `;
      notified = await sendEmail({ to: LEADS_NOTIFY_EMAIL, subject: `[Leads] Descarga gratuita (${source})`, html });
    }

    return res.json({ ok: true, stored: stored.stored || false, fallback: stored.fallback || null, id: stored.id || null, notified });
  } catch (e) {
    console.error('[api] /leads/downloads error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

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
    const orderTotal = itemsForPref.reduce((s, it) => s + Number(it.unit_price) * Number(it.quantity), 0);
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

    // Crear orden preliminar (idempotencia a nivel de negocio)
    let orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    if (pool) {
      try {
        await ensureSchema();
        await pool.query(
          'INSERT INTO orders (id, user_id, email, items, total, currency, status, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [orderId, user?.id || null, user?.email || null, JSON.stringify(itemsForPref), orderTotal, (itemsForPref[0]?.currency_id)||'CLP', 'created', JSON.stringify(md)]
        );
      } catch (e) { console.warn('[api] crear orden falló:', e?.message || e); }
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
      metadata: { ...md, order_id: orderId }
    };
    let resp;
    let body;
    let lastErr = null;
    // 1) SDK con integrator (si está configurado)
    try {
      resp = await mpPreference.create({ body: prefBody, requestOptions: MP_INTEGRATOR_ID ? { headers: { 'x-integrator-id': MP_INTEGRATOR_ID } } : undefined });
      body = resp && resp.init_point ? resp : (resp?.body || resp);
    } catch (eCreate1) {
      lastErr = eCreate1;
      // 2) SDK sin integrator header
      try {
        const r2 = await mpPreference.create({ body: prefBody });
        body = r2 && r2.init_point ? r2 : (r2?.body || r2);
      } catch (eCreate2) {
        lastErr = eCreate2;
        // 3) REST con integrator header
        try {
          const r3 = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
              ...(MP_INTEGRATOR_ID ? { 'x-integrator-id': MP_INTEGRATOR_ID } : {})
            },
            body: JSON.stringify(prefBody)
          });
          const b3 = await r3.json();
          if (!r3.ok) throw new Error(`REST create failed: ${r3.status} ${b3?.error || b3?.message || ''}`);
          body = b3;
        } catch (eCreate3) {
          lastErr = eCreate3;
          // 4) REST sin integrator header
          const r4 = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${MP_ACCESS_TOKEN}`
            },
            body: JSON.stringify(prefBody)
          });
          const b4 = await r4.json();
          if (!r4.ok) throw new Error(`REST create (no integrator) failed: ${r4.status} ${b4?.error || b4?.message || ''}`);
          body = b4;
        }
      }
    }
    // Actualizar orden con preference y estado pendiente
    if (pool) {
      try {
        await pool.query('UPDATE orders SET preference_id=$1, status=$2, updated_at=now() WHERE id=$3', [body.id || body.preference_id || null, 'pending', orderId]);
      } catch (e) { console.warn('[api] actualizar orden falló:', e?.message || e); }
    }

    return res.json({
      id: body.id,
      init_point: body.init_point,
      sandbox_init_point: body.sandbox_init_point
    });
  } catch (e) {
    console.error('[api] mp/create-preference error:', e?.message || e);
    // Fallback REST para obtener más detalle del error
    try {
      const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          ...(MP_INTEGRATOR_ID ? { 'x-integrator-id': MP_INTEGRATOR_ID } : {})
        },
        body: JSON.stringify({
          items: [{ title: 'Diagnóstico', quantity: 1, unit_price: 1000, currency_id: 'CLP', id: '1234' }],
          back_urls: { success: 'https://example.com', pending: 'https://example.com', failure: 'https://example.com' }
        })
      });
      const body = await r.json();
      const status = r.status;
      // Devolver detalles para diagnóstico del integrador
      return res.status(500).json({
        error: 'mp_error',
        message: e?.message || String(e),
        mp_status: status,
        mp_error: body?.error || body?.message || null,
        mp_cause: body?.cause || body?.causes || null
      });
    } catch (e2) {
      return res.status(500).json({ error: 'mp_error', message: e?.message || String(e) });
    }
  }
});

// POST /mp/webhook
router.get('/mp/webhook', async (req, res) => {
  // Endpoint simple para verificación/challenge y debugging rápido
  res.status(200).json({ ok: true, method: 'GET', query: req.query || {} });
});
router.post('/mp/webhook', async (req, res) => {
  try {
    const topic = (req.query.topic || req.query.type || req.body.type || '').toString();
    const id = (req.query['data.id'] || req.body?.data?.id || req.query.id || req.body.id || '').toString();
    if (!id) { res.status(200).json({ ok: true }); return; }

    // Manejo especial de merchant_order: no necesitamos otorgar aquí, pero no debemos fallar
    if (topic === 'merchant_order') {
      // Opcional: podríamos inspeccionar la orden
      try {
        if (MP_ACCESS_TOKEN) {
          const r = await fetch(`https://api.mercadopago.com/merchant_orders/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
          });
          await r.json().catch(()=>null);
        }
      } catch(_){}
      res.status(200).json({ ok: true, topic });
      return;
    }

    // Log webhook event
    if (pool) {
      try {
        await ensureSchema();
        const evId = `wh_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        await pool.query('INSERT INTO webhook_events (id, topic, resource_id, payload) VALUES ($1,$2,$3,$4)', [evId, topic || 'payment', id, JSON.stringify(req.body || {})]);
      } catch (e) { console.warn('[api] guardar webhook_events falló:', e?.message || e); }
    }

    // Para pagos: intentar SDK y luego REST como respaldo
    let payment = null;
    if (mpPayment) {
      try {
        const p = await mpPayment.get({ id, requestOptions: MP_INTEGRATOR_ID ? { headers: { 'x-integrator-id': MP_INTEGRATOR_ID } } : undefined });
        payment = p?.body || p;
      } catch (e) {
        console.warn('[api] mp webhook get payment (SDK) falló:', e?.message || e);
      }
    }
    if (!payment && MP_ACCESS_TOKEN) {
      try {
        const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, {
          headers: {
            Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
            ...(MP_INTEGRATOR_ID ? { 'x-integrator-id': MP_INTEGRATOR_ID } : {})
          }
        });
        const body = await r.json();
        if (r.ok) payment = body; else console.warn('[api] mp webhook get payment (REST) no ok:', body);
      } catch (e) {
        console.warn('[api] mp webhook get payment (REST) falló:', e?.message || e);
      }
    }

    if (payment && payment.status === 'approved') {
      const md = payment.metadata || {};
      const userId = md.user_id || null;
      const email = md.email || (payment.payer && payment.payer.email) || null;
      const ents = md.entitlements || [];
      // Idempotencia: registrar payment procesado
      let isNew = true;
      if (pool) {
        try {
          await ensureSchema();
          await pool.query('INSERT INTO processed_payments (payment_id) VALUES ($1) ON CONFLICT (payment_id) DO NOTHING', [String(payment.id)]);
          const chk = await pool.query('SELECT payment_id FROM processed_payments WHERE payment_id=$1', [String(payment.id)]);
          isNew = !!chk.rowCount;
        } catch (e) { console.warn('[api] processed_payments fallo:', e?.message || e); }
      }

      if (isNew) {
        // Registrar pago y actualizar orden si existe metadata.order_id
        if (pool) {
          try {
            const amount = payment.transaction_amount || payment.total_paid_amount || null;
            const currency = payment.currency_id || 'CLP';
            const method = payment.payment_method_id || payment.payment_type_id || null;
            const orderId = md.order_id || null;
            if (orderId) {
              await pool.query('UPDATE orders SET status=$1, updated_at=now() WHERE id=$2', ['paid', orderId]);
            }
            await pool.query('INSERT INTO payments (id, order_id, status, amount, currency, method, raw) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING', [String(payment.id), orderId, payment.status, amount, currency, method, JSON.stringify(payment)]);
          } catch (e) { console.warn('[api] registrar pago fallo:', e?.message || e); }
        }

        // Otorgar accesos
        await grantEntitlements({ userId, email, entitlements: ents });

        // Email transaccional (opcional)
        if (email) {
          const ok = await sendEmail({
            to: email,
            subject: 'Tu pago fue aprobado – Acceso habilitado',
            html: `<p>¡Gracias por tu compra!</p><p>Tu pago (${payment.id}) fue aprobado. Ya puedes acceder al Portal del Alumno:</p><p><a href="${PUBLIC_SITE_BASE}/portal-alumno.html">Ir al Portal</a></p>`
          });
          if (!ok) console.log('[api] email no enviado (config no presente)');
        }
      }
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

// ==============================
// Debug seguro de token (solo con GRANT_SECRET)
// GET /api/auth/debug-token
// Header: Authorization: Bearer <token>
// Header o query: x-debug-secret / ?secret=
router.get('/auth/debug-token', async (req, res) => {
  try {
    const secret = req.headers['x-debug-secret'] || req.query.secret;
    if (!GRANT_SECRET || !secret || secret !== GRANT_SECRET) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    // Intentar verificación normal
    let decoded = await verifyBearer(req);
    let provider = decoded ? (decoded._supabase ? 'supabase' : 'firebase') : 'unknown';

    // Extra: detectar algoritmo del header para diagnosticar
    let alg = null;
    try {
      const h = req.headers['authorization'] || '';
      const m = /^Bearer\s+(.+)$/i.exec(h);
      if (m) {
        const parts = m[1].split('.');
        const header = JSON.parse(Buffer.from(parts[0] || '', 'base64').toString('utf8'));
        alg = header && header.alg ? String(header.alg) : null;
      }
    } catch(_){}

    // Si no se pudo verificar, intentar decodificar sin verificar (solo para diagnóstico)
    let unsigned = null;
    if (!decoded) {
      const h = req.headers['authorization'] || '';
      const m = /^Bearer\s+(.+)$/i.exec(h);
      if (m) {
        try {
          const parts = m[1].split('.');
          const payload = JSON.parse(Buffer.from(parts[1] || '', 'base64').toString('utf8'));
          unsigned = payload || null;
        } catch(_){}
      }
    }

    const out = { ok: !!decoded, provider, alg };
    if (decoded) {
      out.sub = decoded.uid || decoded.user_id || decoded.sub || null;
      out.email = decoded.email || null;
      out.name = decoded.name || null;
      if (decoded._supabase) {
        out.iss = decoded._supabase.iss || null;
        out.aud = decoded._supabase.aud || null;
        out.exp = decoded._supabase.exp || null;
      }
    } else {
      out.error = 'invalid_token';
      if (unsigned) {
        out.unsigned = {
          iss: unsigned.iss || null,
          aud: unsigned.aud || null,
          sub: unsigned.sub || null,
          email: unsigned.email || null
        };
        if (alg === 'HS256' && !process.env.SUPABASE_JWT_SECRET) {
          out.hint = 'Token HS256 de Supabase: configure SUPABASE_JWT_SECRET en Cloud Run (Auth settings > JWT secret)';
        }
      }
    }

    return res.json(out);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

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
