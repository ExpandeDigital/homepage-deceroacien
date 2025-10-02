import { query } from './db.js';

export async function upsertUserByFirebaseUID({ firebase_uid, email, first_name = null, last_name = null }) {
  if (!firebase_uid || !email) throw new Error('missing_fields');
  const sql = `INSERT INTO users (firebase_uid, email, first_name, last_name)
               VALUES ($1,$2,$3,$4)
               ON CONFLICT (firebase_uid) DO UPDATE SET email = EXCLUDED.email
               RETURNING *`;
  const { rows } = await query(sql, [firebase_uid, email.toLowerCase(), first_name, last_name]);
  return rows[0];
}

export async function findUserByFirebaseUID(firebase_uid){
  const { rows } = await query('SELECT * FROM users WHERE firebase_uid = $1', [firebase_uid]);
  return rows[0]||null;
}

export async function findUserByEmail(email){
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return rows[0]||null;
}
