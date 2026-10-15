import crypto from 'node:crypto';
import { getAdmin } from './_lib/firebase-admin.mjs';
import { getProEvents } from './_lib/pro-events.mjs';

const MIN=60*1000;
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,32);
const activeEntitlement=d=>{
  if(d?.role==='developer')return true;
  if(d?.pushPlan!=='active')return false;
  if(!d?.pushExpiresAt)return true;
  const t=typeof d.pushExpiresAt.toMillis==='function'?d.pushExpiresAt.toMillis():Date.parse(d.pushExpiresAt);
  return Number.isFinite(t)&&t>Date.now();
};

async function alreadySent(db,uid,event,reminder){
  const id=hash(`${uid}|${event.type}|${event.time}|${reminder}`);
  const ref=db.collection('_notificationReceipts').doc(id);
  const snap=await ref.get();
  return {sent:snap.exists,ref};
}

export default async()=>{
  if(process.env.TEST_MODE==='true')return new Response('TEST_MODE: push dispatch skipped');
  const {db,admin}=getAdmin();
  const messaging=admin.messaging();
  const now=Date.now();
  const upcoming=getProEvents().filter(e=>{const lead=(Date.parse(e.time)-now)/MIN;return lead>0&&lead<=60});
  if(!upcoming.length)return new Response('No due Pro events');

  const entSnap=await db.collection('entitlements').limit(1000).get();
  let sent=0,users=0;
  for(const entDoc of entSnap.docs){
    const ent=entDoc.data()||{};
    if(!activeEntitlement(ent))continue;
    const uid=entDoc.id;
    const devSnap=await db.collection('users').doc(uid).collection('devices').get();
    const devices=devSnap.docs.map(d=>d.data()||{}).filter(d=>d.pushEnabled&&d.fcmToken);
    if(!devices.length)continue;
    users++;
    const byReminder=new Map();
    for(const d of devices){const r=Number(d.defaultReminder||0);if(![15,30,60].includes(r))continue;if(!byReminder.has(r))byReminder.set(r,[]);byReminder.get(r).push(d.fcmToken)}
    for(const [reminder,tokens] of byReminder){
      for(const event of upcoming){
        const lead=(Date.parse(event.time)-now)/MIN;
        if(!(lead<=reminder&&lead>reminder-15))continue;
        const receipt=await alreadySent(db,uid,event,reminder);
        if(receipt.sent)continue;
        const title=`${Math.round(lead)} 分鐘後｜${event.name}`;
        const body=event.note?String(event.note).slice(0,120):'重要市場事件即將發生，請留意波動。';
        const unique=[...new Set(tokens)].slice(0,500);
        if(!unique.length)continue;
        const res=await messaging.sendEachForMulticast({tokens:unique,notification:{title,body},data:{type:event.type||'PRO_EVENT',time:event.time||'',url:'/'}});
        sent+=res.successCount;
        await receipt.ref.set({uid,eventType:event.type||null,eventTime:event.time,reminder,successCount:res.successCount,failureCount:res.failureCount,sentAt:admin.firestore.FieldValue.serverTimestamp()});
      }
    }
  }
  return new Response(JSON.stringify({ok:true,users,sent}),{headers:{'content-type':'application/json'}});
};

export const config={schedule:'*/15 * * * *'};
