#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

async function main(){
  const dbUrl = process.env.DATABASE_URL;
  if(!dbUrl){
    console.error('DATABASE_URL no está definida. Exporta la variable antes de ejecutar.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: dbUrl, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false });
  const schemaPath = path.join(process.cwd(),'api','_lib','schema.sql');
  if(!fs.existsSync(schemaPath)){
    console.error('No se encontró schema.sql en', schemaPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(schemaPath,'utf-8');
  const statements = sql.split(/;\s*\n/).map(s=>s.trim()).filter(Boolean);
  const client = await pool.connect();
  try {
    for(const st of statements){
      try {
        await client.query(st);
        console.log('[OK]', st.split('\n')[0].slice(0,80));
      } catch(e){
        console.warn('[WARN]', e.message);
      }
    }
    console.log('Schema aplicado.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e=>{ console.error('Error aplicando schema:', e); process.exit(1); });
