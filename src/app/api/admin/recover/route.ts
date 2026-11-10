import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { allowLogin, checkOrigin, resetAttempts, sessionToken, setSession } from '@/lib/auth';
import { passwordCredentials } from '@/lib/accounts';
import { readData, serialized, writeData } from '@/lib/store';
import { limitedJson } from '@/lib/request';
import type { EmailRecovery } from '@/lib/recovery-email';
export const runtime='nodejs';
export async function POST(request:Request) {
  try {
    checkOrigin(request);
    if(!await allowLogin())return NextResponse.json({error:'Too many attempts. Try again in 15 minutes.'},{status:429});
    const input=await limitedJson(request,2048);
    if(typeof input.token!=='string'||!/^[a-f0-9]{64}$/.test(input.token)||typeof input.password!=='string')throw new Error('Invalid recovery request.');
    const owner=await serialized(async()=>{
      const hash=createHash('sha256').update(input.token as string).digest('hex');
      const manual=await readData<{hash:string;expires:number}|null>('owner-recovery.json',null);
      const emailed=await readData<EmailRecovery|null>('owner-email-recovery.json',null);
      const current=await readData<{secret:string}|null>('owner.json',null);
      if(!current)throw new Error('The owner account has not been configured.');
      const manualValid=manual&&manual.expires>Date.now()&&manual.hash===hash;
      const emailValid=emailed&&emailed.expires>Date.now()&&emailed.hash===hash&&emailed.binding===createHash('sha256').update(current.secret).digest('hex');
      if(!manualValid&&!emailValid)throw new Error('This recovery link has expired or has already been used. Request a new owner recovery email.');
      const updated=passwordCredentials(input.password as string);
      await writeData('owner.json',updated);
      await writeData('owner-recovery.json',null);
      await writeData('owner-email-recovery.json',null);
      return updated;
    });
    await resetAttempts();await setSession(sessionToken(owner),new URL(request.url).protocol==='https:');
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Owner recovery failed.'},{status:400});}
}
