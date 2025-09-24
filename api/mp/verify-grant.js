// Vercel serverless function: GET /api/mp/verify-grant
// Verifica una firma HMAC enviada en el retorno (?grant=SKU&t=...&ref=...&sig=...)

import crypto from 'crypto';

export default async function handler(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { grant, t, ref, sig } = req.query || {};
    if (!grant || !t || !sig) return res.status(400).json({ ok: false, reason: 'missing_params' });

    const GRANT_SECRET = process.env.GRANT_SECRET || process.env.MP_WEBHOOK_SECRET || 'dev-secret';
    const payload = `${grant}|${t}|${ref || ''}`;
    const expected = crypto.createHmac('sha256', GRANT_SECRET).update(payload).digest('hex');
    const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    // Validez temporal (10 minutos) para evitar reusos
    const now = Date.now();
    const fresh = Math.abs(now - Number(t)) < 10 * 60 * 1000;
    return res.status(200).json({ ok: valid && fresh });
  } catch (e) {
    return res.status(200).json({ ok: false });
  }
}
