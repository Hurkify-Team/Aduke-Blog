import { NextResponse } from 'next/server';
import { allowLogin,checkOrigin,resetAttempts,setSession,staffSessionToken } from '@/lib/auth';
import { recoverStaffPassword } from '@/lib/accounts';
import { limitedJson } from '@/lib/request';
export const runtime='nodejs';
export async function POST(request:Request){
  try{
    checkOrigin(request);if(!await allowLogin())return NextResponse.json({error:'Too many attempts. Try again in 15 minutes.'},{status:429});
    const input=await limitedJson(request,2048);
    if(typeof input.token!=='string'||typeof input.password!=='string')throw new Error('Invalid reset request.');
    const account=await recoverStaffPassword(input.token,input.password);
    await resetAttempts();await setSession(staffSessionToken(account),new URL(request.url).protocol==='https:');
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not reset team password.'},{status:400});}
}
