import admin from 'firebase-admin';

let app;

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON missing');
  const parsed = JSON.parse(raw);
  if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  return parsed;
}

export function getAdmin() {
  if (!app) {
    app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({ credential: admin.credential.cert(parseServiceAccount()) });
  }
  return {
    admin,
    auth: admin.auth(app),
    db: admin.firestore(app),
  };
}

export async function requireUser(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error('UNAUTHENTICATED'), { status: 401 });
  const { auth } = getAdmin();
  try {
    return await auth.verifyIdToken(match[1], true);
  } catch {
    throw Object.assign(new Error('UNAUTHENTICATED'), { status: 401 });
  }
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}
