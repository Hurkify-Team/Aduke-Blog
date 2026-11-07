import { limitedJson } from '@/lib/request';
import { NextResponse } from 'next/server';
import { changePassword, allowLogin, authenticateAccount, currentUser, checkOrigin, isLocalRequest, resetAttempts, revokeSessions, sessionToken, staffSessionToken, setSession, setupOwner, clearSession } from '@/lib/auth';
import { changeStaffPassword, revokeStaffSessions } from '@/lib/accounts';
export const runtime='nodejs';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (!await allowLogin()) return NextResponse.json({error:'Too many sign-in attempts. Try again in 15 minutes.'},{status:429});
    const input=await limitedJson(request,4096);
    if (typeof input.password!=='string' || input.password.length>200 || (input.username!==undefined && (typeof input.username!=='string' || input.username.length>40))) throw new Error('Enter a valid username and password.');
    let token;
    if (input.action==='setup') {
      if (!isLocalRequest(request)) return NextResponse.json({error:'Create the owner account from localhost.'},{status:403});
      token=sessionToken(await setupOwner(input.password));
    } else token=await authenticateAccount(typeof input.username==='string'?input.username:'owner',input.password);
    if (!token) return NextResponse.json({error:'Incorrect username or password, or this account is not active.'},{status:401});
    await resetAttempts();await setSession(token,new URL(request.url).protocol==='https:');return NextResponse.json({ok:true});
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:'Sign-in failed.'},{status:400}); }
}
export async function DELETE(request:Request) {
  try {
    checkOrigin(request);const user=await currentUser();
    if (!user) { await clearSession();return NextResponse.json({ok:true}); }
    if (user.role==='owner') await revokeSessions();else {await revokeStaffSessions(user.id);await clearSession();}
    return NextResponse.json({ok:true});
  } catch {return NextResponse.json({error:'Invalid request.'},{status:403});}
}
export async function PATCH(request:Request) {
  const user=await currentUser();if (!user) return NextResponse.json({error:'Please sign in.'},{status:401});
  try {
    checkOrigin(request);if (!await allowLogin()) return NextResponse.json({error:'Too many attempts. Try again in 15 minutes.'},{status:429});
    const input=await limitedJson(request,4096);
    if (typeof input.currentPassword!=='string' || input.currentPassword.length>200 || typeof input.newPassword!=='string') throw new Error('Enter valid passwords.');
    const token=user.role==='owner'?sessionToken(await changePassword(input.currentPassword,input.newPassword)):staffSessionToken(await changeStaffPassword(user,input.currentPassword,input.newPassword));
    await resetAttempts();await setSession(token,new URL(request.url).protocol==='https:');return NextResponse.json({ok:true});
  } catch(error) {return NextResponse.json({error:error instanceof Error?error.message:'Could not update password.'},{status:400});}
}
