import { getAdmin, json, requireUser } from './_lib/firebase-admin.mjs';

const DEFAULT_ENTITLEMENTS = {
  role: 'user',
  baseAccess: null,
  pushPlan: 'inactive',
  pushExpiresAt: null,
  themes: [],
};

function testEntitlements(uid) {
  if (process.env.TEST_MODE !== 'true') return null;
  const mode = (process.env.TEST_ENTITLEMENT_MODE || 'all').toLowerCase();
  const all = {
    role: 'developer',
    baseAccess: 'lifetime',
    pushPlan: 'active',
    pushExpiresAt: null,
    themes: ['pink', 'cream', 'mint'],
    testMode: true,
  };
  if (mode === 'free') return { ...DEFAULT_ENTITLEMENTS, testMode: true };
  if (mode === 'base') return { ...DEFAULT_ENTITLEMENTS, baseAccess: 'lifetime', testMode: true };
  if (mode === 'push') return { ...DEFAULT_ENTITLEMENTS, baseAccess: 'lifetime', pushPlan: 'active', testMode: true };
  if (mode === 'theme') return { ...DEFAULT_ENTITLEMENTS, baseAccess: 'lifetime', themes: ['pink'], testMode: true };
  return all;
}

export default async (request) => {
  try {
    const user = await requireUser(request);
    const simulated = testEntitlements(user.uid);
    if (simulated) return json(simulated);

    if (process.env.FIREBASE_OWNER_UID && user.uid === process.env.FIREBASE_OWNER_UID) {
      return json({
        role: 'developer',
        baseAccess: 'lifetime',
        pushPlan: 'active',
        pushExpiresAt: null,
        themes: ['pink', 'cream', 'mint'],
      });
    }

    const { db } = getAdmin();
    const snap = await db.collection('entitlements').doc(user.uid).get();
    const data = snap.exists ? snap.data() : {};
    return json({ ...DEFAULT_ENTITLEMENTS, ...data });
  } catch (err) {
    return json({ error: err.message || 'ENTITLEMENT_ERROR' }, err.status || 500);
  }
};
