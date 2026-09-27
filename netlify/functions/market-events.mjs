import { getAdmin, json, requireUser } from './_lib/firebase-admin.mjs';
import { getProEvents } from './_lib/pro-events.mjs';

async function canUsePro(uid){
  if(process.env.TEST_MODE==='true')return true;
  if(process.env.FIREBASE_OWNER_UID && uid===process.env.FIREBASE_OWNER_UID)return true;
  const {db}=getAdmin();
  const snap=await db.collection('entitlements').doc(uid).get();
  if(!snap.exists)return false;
  const d=snap.data()||{};
  if(d.role==='developer')return true;
  if(d.pushPlan!=='active')return false;
  if(!d.pushExpiresAt)return true;
  const t=typeof d.pushExpiresAt.toMillis==='function'?d.pushExpiresAt.toMillis():Date.parse(d.pushExpiresAt);
  return Number.isFinite(t)&&t>Date.now();
}

export default async request=>{
  try{
    const user=await requireUser(request);
    if(!(await canUsePro(user.uid)))return json({pro:false,events:[]},403);
    const now=Date.now()-24*60*60*1000;
    const events=getProEvents().filter(e=>Date.parse(e.time)>=now);
    return json({pro:true,updatedAt:new Date().toISOString(),events});
  }catch(err){
    return json({error:err.message||'MARKET_EVENTS_ERROR'},err.status||500);
  }
};
