import nodemailer from 'nodemailer';

let _transporter;
export function getTransporter(){
  if (_transporter) return _transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';
  if (!host || !user || !pass) {
    console.warn('[mailer] SMTP variables no configuradas. Emails no serán enviados.');
    return null;
  }
  _transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  return _transporter;
}

export async function sendEmail({ to, subject, html, text }){
  const t = getTransporter();
  if (!t) { console.warn('[mailer] skip send, transporter null'); return { skipped:true }; }
  const from = process.env.SMTP_FROM || `DE CERO A CIEN <no-reply@deceroacien.app>`;
  const info = await t.sendMail({ from, to, subject, html, text });
  return { messageId: info.messageId };
}
