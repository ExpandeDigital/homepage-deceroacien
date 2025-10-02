#!/usr/bin/env node
import pg from 'pg';

const { Pool } = pg;

const PRODUCTS = [
  ['course.pmv','Programa PMV','Acceso programa PMV'],
  ['course.pmf','Programa PMF','Acceso programa PMF'],
  ['course.growth','Programa Growth','Acceso programa Growth'],
  ['course.ceo','Masterclass CEO','Acceso masterclass CEO'],
  ['product.deceroacien','Pack De Cero a Cien','Acceso completo'],
  ['product.camino_dorado','Pack Camino Dorado','Acceso completo camino'],
  ['camino.fase1','Camino Dorado Fase 1','Contenido Fase 1'],
  ['camino.fase2','Camino Dorado Fase 2','Contenido Fase 2'],
  ['camino.fase3','Camino Dorado Fase 3','Contenido Fase 3'],
  ['camino.fase4','Camino Dorado Fase 4','Contenido Fase 4'],
  ['camino.fase5','Camino Dorado Fase 5','Contenido Fase 5'],
  ['decero.fase1','De Cero a Cien Fase 1','Contenido Fase 1'],
  ['decero.fase2','De Cero a Cien Fase 2','Contenido Fase 2'],
  ['decero.fase3','De Cero a Cien Fase 3','Contenido Fase 3'],
  ['decero.fase4','De Cero a Cien Fase 4','Contenido Fase 4'],
  ['decero.fase5','De Cero a Cien Fase 5','Contenido Fase 5']
];

async function main(){
  const dbUrl = process.env.DATABASE_URL;
  if(!dbUrl){
    console.error('DATABASE_URL no definida');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: dbUrl, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized:false } : false });
  const client = await pool.connect();
  try {
    for(const [sku,name,desc] of PRODUCTS){
      await client.query('INSERT INTO products (sku,name,description) VALUES ($1,$2,$3) ON CONFLICT (sku) DO NOTHING',[sku,name,desc]);
      console.log('OK', sku);
    }
  } finally {
    client.release();
    await pool.end();
  }
  console.log('Seed completado.');
}

main().catch(e=>{ console.error(e); process.exit(1); });
