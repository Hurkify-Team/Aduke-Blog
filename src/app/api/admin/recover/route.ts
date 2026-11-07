import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { allowLogin, checkOrigin, resetAttempts, sessionToken, setSession } from '@/lib/auth';
import { passwordCredentials } from '@/lib/accounts';
import { readData, serialized, writeData } from '@/lib/store';
import { limitedJson } from '@/lib/request';
export const runtime='nodejs';
export async function POST(request:Request) {
  try {
    checkOrigin(request);
    if(!await allowLogin())return NextResponse.json({error:'Too many attempts. Try again in 15 minutes.'},{status:429});
    const input=await limitedJson(request,2048);
    if(typeof input.token!=='string'||!/^[a-f0-9]{64}$/.test(input.token)||typeof input.password!=='string')throw new Error('Invalid recovery request.');
    const owner=await serialized(async()=>{
      const recovery=await readData<{hash:string;expires:number}|null>('owner-recovery.json',null);
      if(!recovery||recovery.expires<Date.now()||recovery.hash!==createHash('sha256').update(input.token as string).digest('hex'))throw new Error('This recovery link has expired or has already been used. Generate a new link from the project terminal.');
      if(!await readData('owner.json',null))throw new Error('The owner account has not been configured.');
      const updated=passwordCredentials(input.password as string);
      await writeData('owner.json',updated);
      await writeData('owner-recovery.json',null);
      return updated;
    });
    await resetAttempts();await setSession(sessionToken(owner),new URL(request.url).protocol==='https:');
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Owner recovery failed.'},{status:400});}
}
