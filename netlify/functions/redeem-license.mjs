import crypto from 'node:crypto';
import { getAdmin, json, requireUser } from './_lib/firebase-admin.mjs';

function normalizeKey(value = '') {
  return String(value).trim().toUpperCase().replace(/\s+/g, '');
}
function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}
async function verifyPayhip(key) {
  const secret = process.env.PAYHIP_PRODUCT_SECRET_KEY;
  if (!secret) throw new Error('PAYHIP_PRODUCT_SECRET_KEY missing');
  const url = new URL('https://payhip.com/api/v2/license/verify');
  url.searchParams.set('license_key', key);
  const r = await fetch(url, { headers: { 'product-secret-key': secret, 'user-agent': 'TradeReminder/2.2.1' } });
  if (!r.ok) throw new Error('PAYHIP_VERIFY_FAILED');
  const body = await r.json().catch(() => ({}));
  const data = body?.data;
  if (!data?.enabled || normalizeKey(data.license_key) !== key) throw new Error('INVALID_LICENSE');
  if (process.env.PAYHIP_PRODUCT_LINK && data.product_link !== process.env.PAYHIP_PRODUCT_LINK) throw new Error('WRONG_PRODUCT');
  return data;
}

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405, { allow: 'POST' });
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const licenseKey = normalizeKey(body.licenseKey);
    if (licenseKey.length < 12 || licenseKey.length > 128) return json({ error: 'INVALID_LICENSE_FORMAT' }, 400);

    const verified = await verifyPayhip(licenseKey);
    const keyHash = hashKey(licenseKey);
    const { db, admin } = getAdmin();
    const licenseRef = db.collection('licenseBindings').doc(keyHash);
    const entitlementRef = db.collection('entitlements').doc(user.uid);

    await db.runTransaction(async (tx) => {
      const [bindingSnap, entitlementSnap] = await Promise.all([tx.get(licenseRef), tx.get(entitlementRef)]);
      if (bindingSnap.exists && bindingSnap.data()?.uid !== user.uid) throw Object.assign(new Error('LICENSE_ALREADY_BOUND'), { status: 409 });
      const current = entitlementSnap.exists ? entitlementSnap.data() : {};
      tx.set(licenseRef, {
        uid: user.uid,
        productLink: verified.product_link || null,
        buyerEmail: verified.buyer_email || null,
        boundAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      tx.set(entitlementRef, {
        role: current.role || 'user',
        baseAccess: 'lifetime',
        pushPlan: current.pushPlan || 'inactive',
        pushExpiresAt: current.pushExpiresAt || null,
        themes: Array.isArray(current.themes) ? current.themes : [],
        licenseBoundAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return json({ ok: true, baseAccess: 'lifetime' });
  } catch (err) {
    const map = {
      INVALID_LICENSE: 400,
      WRONG_PRODUCT: 400,
      LICENSE_ALREADY_BOUND: 409,
      PAYHIP_VERIFY_FAILED: 502,
    };
    return json({ error: err.message || 'LICENSE_ERROR' }, err.status || map[err.message] || 500);
  }
};
