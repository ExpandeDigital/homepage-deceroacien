import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { Pool } from 'pg';

// Config
const PORT = process.env.PORT || 3001;
const BASE_PATH = process.env.BASE_PATH || '/api';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://deceroacien.app,https://www.deceroacien.app')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

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

app.use(BASE_PATH, router);

app.listen(PORT, () => {
  console.log(`[api] listening on :${PORT} basePath=${BASE_PATH}`);
  console.log(`[api] allowed origins:`, ALLOWED_ORIGINS);
});
