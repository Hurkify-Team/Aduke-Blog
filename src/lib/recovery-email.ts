import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { siteOrigin } from './config';
import { readData, serialized, writeData } from './store';

export type EmailRecovery = {hash:string;expires:number;binding:string;requestedAt:number;delivery:'pending'|'sent'|'failed'};
export function normalEmail(value:unknown) {
  if(typeof value!=='string')return '';
  const email=value.trim().toLowerCase();
  return email.length<=254&&/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)?email:'';
}
export function emailRecoveryConfigured(){
  const sender=process.env.AUTH_EMAIL_FROM||'';
  let origin:URL;try{origin=new URL(siteOrigin());}catch{return false;}
  const secure=origin.protocol==='https:'||!process.env.VERCEL&&origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname);
  return !!(secure&&normalEmail(process.env.OWNER_RECOVERY_EMAIL)&&process.env.RESEND_API_KEY&&normalEmail(sender.match(/<([^<>]+)>$/)?.[1]||sender)&&!/[\r\n]/.test(sender));
}
export async function sendOwnerRecovery(email:string,url:string,id:string){
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`owner-recovery-${id}`},
    body:JSON.stringify({from:process.env.AUTH_EMAIL_FROM,to:[email],subject:'Reset your Aduke Radio TV owner password',text:`A password reset was requested for your Aduke Radio TV owner account.\n\nOpen this private link to choose a new password:\n${url}\n\nThis link expires in 30 minutes and works once. Your current password remains valid until you complete the reset. If you did not request this, ignore this email. Never share the link.\n\nAduke Radio TV`}),
  });
  if(!response.ok)throw new Error('Recovery email delivery failed.');
}
export async function requestOwnerRecovery(input:string){
  const email=normalEmail(input),recipient=normalEmail(process.env.OWNER_RECOVERY_EMAIL);
  if(!emailRecoveryConfigured())throw new Error('Email recovery is not configured yet. Contact the site administrator or use your private recovery link.');
  // The origin comes from trusted server configuration, never a submitted Host or URL.
  const origin=new URL(siteOrigin());
  if(origin.protocol!=='https:'&&(process.env.VERCEL||!['localhost','127.0.0.1'].includes(origin.hostname)))throw new Error('Configure a secure public site URL.');
  const request=await serialized(async()=>{
    let rate=await readData('owner-email-limit.json',{count:0,reset:0});
    if(rate.reset<Date.now())rate={count:0,reset:Date.now()+60*60*1000};
    if(rate.count>=100)return null;
    await writeData('owner-email-limit.json',{...rate,count:rate.count+1});
    const owner=await readData<{secret:string}|null>('owner.json',null);
    const previous=await readData<EmailRecovery|null>('owner-email-recovery.json',null);
    if(!owner||!email||email!==recipient||previous&&previous.requestedAt>Date.now()-5*60*1000)return null;
    const token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex');
    const recovery:EmailRecovery={hash,expires:Date.now()+30*60*1000,binding:createHash('sha256').update(owner.secret).digest('hex'),requestedAt:Date.now(),delivery:'pending'};
    await writeData('owner-email-recovery.json',recovery);
    return {token,hash};
  });
  if(!request)return;
  let delivered=false;
  try{await sendOwnerRecovery(recipient,`${origin.origin}/admin/recover#token=${request.token}`,request.hash);delivered=true;}
  catch{console.error('Owner password recovery email could not be delivered. Check the email service configuration.');}
  await serialized(async()=>{
    const current=await readData<EmailRecovery|null>('owner-email-recovery.json',null);
    if(current?.hash===request.hash)await writeData('owner-email-recovery.json',{...current,delivery:delivered?'sent':'failed',...(delivered?{}:{expires:0,requestedAt:0})});
  });
}
