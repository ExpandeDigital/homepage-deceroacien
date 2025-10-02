// POST /api/maintenance/reconcile-guest  – asegura que el user con firebase_uid real absorba al guest por email
import { verifyIdToken } from '../_lib/firebaseAdmin.js';
import { query } from '../_lib/db.js';

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const decoded = await verifyIdToken(req.headers.authorization);
    const { uid, email } = decoded || {};
    if (!uid || !email) return res.status(401).json({ error: 'unauthorized' });

    // 1) Encontrar usuario real y guest por email
    const { rows } = await query('SELECT * FROM users WHERE email = $1 ORDER BY created_at ASC',[email.toLowerCase()]);
    if (rows.length === 0) return res.status(200).json({ ok: true, merged: false });
    // user destino será el primero con firebase_uid = uid si existe, o el más antiguo
    let real = rows.find(r=>r.firebase_uid === uid);
    if (!real) {
      // si no hay, usar la fila más antigua y asignarle el uid
      real = rows[0];
      await query('UPDATE users SET firebase_uid = $1 WHERE id = $2',[uid, real.id]);
    }

    // 2) Mover enrollments de otros users (guest_) al real
    for (const u of rows) {
      if (u.id === real.id) continue;
      await query('UPDATE enrollments SET user_id = $1 WHERE user_id = $2',[real.id, u.id]);
      await query('UPDATE payments SET user_id = $1 WHERE user_id = $2',[real.id, u.id]);
      // Borrar duplicados de enrollments por unique(user_id,product_id) se resuelve con ON CONFLICT DO NOTHING a futuro
      // Eliminar usuario sobrante
      await query('DELETE FROM users WHERE id = $1',[u.id]);
    }

    return res.status(200).json({ ok: true, merged: rows.length > 1 });
  } catch (e) {
    console.warn('reconcile-guest error', e.message);
    return res.status(200).json({ ok: false });
  }
}
