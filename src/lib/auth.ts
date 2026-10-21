import 'server-only';
import { cookies } from 'next/headers';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readData, serialized, writeData } from './store';

type Owner = { salt: string; hash: string; secret: string };
const cookieName = 'aduke-owner';
export async function ownerConfig() { return readData<Owner | null>('owner.json', null); }
export async function setupOwner(password: string) {
  if (password.length < 12 || password.length > 200) throw new Error('Use a password between 12 and 200 characters.');
  return serialized(async () => {
    if (await ownerConfig()) throw new Error('The owner account is already configured. Sign in instead.');
    const salt = randomBytes(16).toString('hex');
    const owner = { salt, hash: scryptSync(password, salt, 64).toString('hex'), secret: randomBytes(32).toString('hex') };
    await writeData('owner.json', owner); return owner;
  });
}
export function verifyPassword(owner: Owner, password: string) {
  return password.length <= 200 && timingSafeEqual(Buffer.from(owner.hash, 'hex'), scryptSync(password, owner.salt, 64));
}
export function sessionToken(owner: Owner) {
  const payload = `${Date.now() + 12 * 60 * 60 * 1000}.${randomBytes(16).toString('hex')}`;
  return `${payload}.${createHmac('sha256', owner.secret).update(payload).digest('hex')}`;
}
export async function isOwner() {
  const owner = await ownerConfig(), token = (await cookies()).get(cookieName)?.value;
  if (!owner || !token) return false;
  const parts = token.split('.'); if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  const expected = createHmac('sha256', owner.secret).update(parts.slice(0, 2).join('.')).digest();
  return timingSafeEqual(expected, Buffer.from(parts[2], 'hex')) && Number(parts[0]) > Date.now();
}
export async function setSession(token: string, secure: boolean) {
  (await cookies()).set(cookieName, token, { httpOnly: true, sameSite: 'strict', secure, path: '/', maxAge: 12 * 60 * 60 });
}
export async function clearSession() { (await cookies()).delete(cookieName); }
export async function revokeSessions() {
  await serialized(async () => { const owner = await ownerConfig(); if (owner) await writeData('owner.json', { ...owner, secret: randomBytes(32).toString('hex') }); });
  await clearSession();
}
export function checkOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new Error('Invalid request origin.');
}
export function isLocalRequest(request: Request) {
  if (process.env.VERCEL) return false;
  return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
}
type LoginAttempts = { count: number; reset: number };
export async function allowLogin() {
  return serialized(async () => {
    let attempts = await readData<LoginAttempts | null>('login-attempts.json', null);
    if (!attempts || attempts.reset < Date.now()) attempts = { count: 0, reset: Date.now() + 15 * 60 * 1000 };
    attempts.count += 1;
    await writeData('login-attempts.json', attempts);
    return attempts.count <= 15;
  });
}
export async function resetAttempts() { await serialized(() => writeData('login-attempts.json', { count: 0, reset: 0 })); }

export async function changePassword(currentPassword: string, newPassword: string) {
  if (newPassword.length < 12 || newPassword.length > 200) throw new Error('Use a password between 12 and 200 characters.');
  return serialized(async () => {
    const owner = await ownerConfig();
    if (!owner || !verifyPassword(owner, currentPassword)) throw new Error('Incorrect current password.');
    const salt = randomBytes(16).toString('hex');
    const updated = { salt, hash: scryptSync(newPassword, salt, 64).toString('hex'), secret: randomBytes(32).toString('hex') };
    await writeData('owner.json', updated);
    return updated;
  });
}
