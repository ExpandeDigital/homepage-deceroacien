// Firebase Admin singleton init
import admin from 'firebase-admin';

let _inited = false;
export function initFirebase() {
  if (_inited) return admin;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin env vars missing – endpoints requiring auth will fail');
    return null;
  }
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey })
      });
    }
    _inited = true;
  } catch (e) {
    console.error('Firebase admin init error', e);
  }
  return admin;
}

export async function verifyIdToken(authHeader) {
  const adminApp = initFirebase();
  if (!adminApp) throw new Error('firebase_not_configured');
  if (!authHeader) throw new Error('missing_auth_header');
  const token = authHeader.replace(/^[Bb]earer\s+/, '');
  try {
    const decoded = await adminApp.auth().verifyIdToken(token, true);
    return decoded; // contains uid, email, etc.
  } catch (e) {
    throw new Error('invalid_token');
  }
}
