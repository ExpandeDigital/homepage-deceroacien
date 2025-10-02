// Simple PG connection (for Vercel serverless). Use pooled singleton.
import pg from 'pg';

const { Pool } = pg;

let _pool;
export function getPool() {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not set');
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false });
  }
  return _pool;
}

export async function query(text, params) {
  const pool = getPool();
  const res = await pool.query(text, params);
  return res;
}

export async function getClient() {
  return getPool().connect();
}
