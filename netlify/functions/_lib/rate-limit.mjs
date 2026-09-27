import crypto from 'node:crypto';
import { getAdmin } from './firebase-admin.mjs';

function keyHash(value){return crypto.createHash('sha256').update(String(value)).digest('hex')}

export async function enforceRateLimit({scope,identity,limit=8,windowMs=10*60*1000}){
  const {db,admin}=getAdmin();
  const now=Date.now();
  const bucket=Math.floor(now/windowMs);
  const ref=db.collection('_rateLimits').doc(`${scope}_${keyHash(identity)}_${bucket}`);
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    const count=snap.exists?Number(snap.data()?.count||0):0;
    if(count>=limit)throw Object.assign(new Error('RATE_LIMITED'),{status:429});
    tx.set(ref,{count:count+1,expiresAt:new Date((bucket+2)*windowMs),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
  });
}

export function clientIdentity(request,user){
  const fwd=request.headers.get('x-nf-client-connection-ip')||request.headers.get('x-forwarded-for')||'';
  return `${user?.uid||'anon'}|${String(fwd).split(',')[0].trim()}`;
}
