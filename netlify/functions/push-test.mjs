import { getAdmin, requireUser, json } from './_lib/firebase-admin.mjs';

export default async (request) => {
  try {
    const user = await requireUser(request);
    const isOwner = !!process.env.FIREBASE_OWNER_UID && user.uid === process.env.FIREBASE_OWNER_UID;
    if (process.env.TEST_MODE !== 'true' && !isOwner) return json({ error: 'FORBIDDEN' }, 403);

    const { db, admin } = getAdmin();
    const snap = await db.collection('users').doc(user.uid).collection('devices').get();
    const tokens = [...new Set(
      snap.docs.map(d => d.data() || {}).filter(d => d.pushEnabled && d.fcmToken).map(d => d.fcmToken)
    )].slice(0, 20);

    if (!tokens.length) return json({ error: 'NO_DEVICE' }, 400);

    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: '交易小提醒｜Push 測試',
        body: '✅ 測試通知送達，FCM 推播鏈路正常。'
      },
      data: { type: 'TEST_PUSH', url: '/' }
    });

    return json({ ok: true, successCount: res.successCount, failureCount: res.failureCount });
  } catch (err) {
    return json({ error: err?.message || 'UNKNOWN_ERROR' }, err?.status || 500);
  }
};
