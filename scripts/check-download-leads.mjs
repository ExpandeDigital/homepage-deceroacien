#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

function loadEnv(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) return {};
  const env = {};
  const lines = fs.readFileSync(abs, 'utf-8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    env[key] = value;
  }
  return env;
}

const env = { ...loadEnv('.env'), ...process.env };
const connectionString = env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL no definido.');
  process.exit(1);
}
const sslSetting = String(env.PGSSL || '').toLowerCase();
const ssl = sslSetting === 'false' ? false : { rejectUnauthorized: false };

const pool = new Pool({ connectionString, ssl });

async function main() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM download_leads');
    console.log({ count: rows[0]?.count ?? 0 });
  } catch (error) {
    console.error('Error consultando download_leads:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
