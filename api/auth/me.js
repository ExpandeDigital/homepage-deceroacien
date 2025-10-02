// GET /api/auth/me  (requires Firebase ID token)
import { verifyIdToken } from '../_lib/firebaseAdmin.js';
import { upsertUserByFirebaseUID, findUserByFirebaseUID } from '../_lib/users.js';
import { listUserEnrollments } from '../_lib/enrollments.js';

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const authHeader = req.headers.authorization;
    const decoded = await verifyIdToken(authHeader);
    const { uid, email, name } = decoded;
    if (!email) return res.status(401).json({ error: 'email_missing_in_token' });

    // Derivar first/last
    let first=null,last=null;
    if (name) {
      const parts = name.split(/\s+/);
      first = parts.shift();
      last = parts.join(' ') || null;
    }

    await upsertUserByFirebaseUID({ firebase_uid: uid, email, first_name: first, last_name: last });
    const user = await findUserByFirebaseUID(uid);
    const enrollments = await listUserEnrollments(user.id);

    return res.status(200).json({
      user: {
        id: user.id,
        firebase_uid: user.firebase_uid,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      },
      enrollments
    });
  } catch (e) {
    console.warn('auth/me error', e.message);
    return res.status(401).json({ error: 'unauthorized' });
  }
}
