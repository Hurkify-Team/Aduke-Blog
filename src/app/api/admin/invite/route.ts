import { NextResponse } from 'next/server';
import { activateAccount, invitationInfo } from '@/lib/accounts';
import { allowLogin, checkOrigin, setSession, staffSessionToken } from '@/lib/auth';
import { limitedJson } from '@/lib/request';
export const runtime='nodejs';
export async function POST(request:Request) {
  try {
    checkOrigin(request);if (!await allowLogin()) return NextResponse.json({error:'Too many attempts. Try again in 15 minutes.'},{status:429});
    const input=await limitedJson(request,4096);
    if (typeof input.token!=='string' || input.token.length!==64) throw new Error('Invalid setup link.');
    if (input.action==='preview') {const user=await invitationInfo(input.token);if (!user) throw new Error('This setup link is invalid, expired or already used.');return NextResponse.json(user,{headers:{'Cache-Control':'no-store'}});}
    if (input.action!=='activate' || typeof input.password!=='string') throw new Error('Enter a password to activate your account.');
    const account=await activateAccount(input.token,input.password);await setSession(staffSessionToken(account),new URL(request.url).protocol==='https:');
    return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  } catch(error) {return NextResponse.json({error:error instanceof Error?error.message:'Could not activate account.'},{status:400});}
}
