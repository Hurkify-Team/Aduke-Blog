import { limitedJson } from '@/lib/request';
import { NextResponse } from 'next/server';
import { changePassword, allowLogin, checkOrigin, isOwner, isLocalRequest, ownerConfig, resetAttempts, revokeSessions, sessionToken, setSession, setupOwner, verifyPassword } from '@/lib/auth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (!await allowLogin()) return NextResponse.json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' }, { status: 429 });
    const input = await limitedJson(request, 4096);
    if (typeof input.password !== 'string' || input.password.length > 200) throw new Error('Enter a valid password.');
    let owner = await ownerConfig();
    if (input.action === 'setup') {
      if (!isLocalRequest(request)) return NextResponse.json({ error: 'Create the owner account from localhost.' }, { status: 403 });
      owner = await setupOwner(input.password);
    } else if (!owner || !verifyPassword(owner, input.password)) return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    await resetAttempts(); await setSession(sessionToken(owner), new URL(request.url).protocol === 'https:');
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Sign-in failed.' }, { status: 400 }); }
}
export async function DELETE(request: Request) {
  try { checkOrigin(request); if (!await isOwner()) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 }); await revokeSessions(); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 403 }); }
}

export async function PATCH(request: Request) {
  if (!await isOwner()) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    checkOrigin(request);
    if (!await allowLogin()) return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
    const input = await limitedJson(request, 4096);
    if (typeof input.currentPassword !== 'string' || input.currentPassword.length > 200 || typeof input.newPassword !== 'string') throw new Error('Enter valid passwords.');
    const owner = await changePassword(input.currentPassword, input.newPassword);
    await resetAttempts();
    await setSession(sessionToken(owner), new URL(request.url).protocol === 'https:');
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update password.' }, { status: 400 }); }
}
