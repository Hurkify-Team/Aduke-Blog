import 'server-only';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { readData, serialized, writeData } from './store';
import type { StaffIdentity, TeamMember } from '@/types/team';
export type Credentials = { salt: string; hash: string; secret: string };
export type Account = TeamMember & Partial<Credentials> & { inviteHash?: string; inviteExpires?: number; recoveryHash?:string; recoveryExpires?:number; recoveryBinding?:string };
export function passwordCredentials(password: string): Credentials {
  if (password.length < 12 || password.length > 200) throw new Error('Use a password between 12 and 200 characters.');
  const salt = randomBytes(16).toString('hex');
  return { salt, hash:scryptSync(password,salt,64).toString('hex'),secret:randomBytes(32).toString('hex') };
}
export function verifyCredentials(account: Partial<Credentials>, password: string) {
  if (!account.hash || !account.salt || password.length > 200) return false;
  const expected=Buffer.from(account.hash,'hex'), actual=scryptSync(password,account.salt,64);
  return expected.length===actual.length && timingSafeEqual(expected,actual);
}
export const accounts = () => readData<Account[]>('team.json',[]);
export function identity(account: StaffIdentity): StaffIdentity { return {id:account.id,username:account.username,name:account.name,role:account.role}; }
export async function teamList(): Promise<TeamMember[]> { return (await accounts()).map(account=>({...identity(account),status:account.status,createdAt:account.createdAt})); }
export async function inviteAccount(input: Record<string,unknown>) {
  return serialized(async()=>{
    const username=typeof input.username==='string'?input.username.trim().toLowerCase():'';
    const name=typeof input.name==='string'?input.name.trim():'';
    if (!/^[a-z][a-z0-9._-]{2,39}$/.test(username) || username==='owner') throw new Error('Use a unique username of 3-40 letters, numbers, dots, underscores or hyphens; owner is reserved.');
    if (!name || name.length>100 || !['editor','author'].includes(String(input.role))) throw new Error('Enter a name and choose Editor or Author.');
    const members=await accounts();
    if (members.some(account=>account.username===username)) throw new Error('That username already exists.');
    if (members.length>=50) throw new Error('The team limit is 50 accounts.');
    const token=randomBytes(32).toString('hex');
    const account: Account={id:randomUUID(),username,name,role:input.role as 'editor'|'author',status:'invited',createdAt:new Date().toISOString(),inviteHash:createHash('sha256').update(token).digest('hex'),inviteExpires:Date.now()+7*24*60*60*1000};
    await writeData('team.json',[...members,account]);
    return {token,member:{...identity(account),status:account.status,createdAt:account.createdAt}};
  });
}
function validInvitation(account: Account, token: string) { return account.status==='invited' && !!account.inviteHash && (account.inviteExpires||0)>Date.now() && createHash('sha256').update(token).digest('hex')===account.inviteHash; }
export async function invitationInfo(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const account=(await accounts()).find(account=>validInvitation(account,token));
  return account ? identity(account) : null;
}
export async function activateAccount(token: string,password: string) {
  return serialized(async()=>{
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('This setup link is invalid or expired.');
    const members=await accounts(), account=members.find(account=>validInvitation(account,token));
    if (!account) throw new Error('This setup link is invalid, expired or already used. Ask the owner for a new invitation.');
    const updated:Account={...account,...passwordCredentials(password),status:'active'}; delete updated.inviteHash; delete updated.inviteExpires;
    await writeData('team.json',members.map(member=>member.id===updated.id?updated:member)); return updated;
  });
}
export async function manageAccount(id: string, action: string, role?: unknown) {
  return serialized(async()=>{
    const members=await accounts(), account=members.find(member=>member.id===id);
    if (!account) throw new Error('Team member not found.');
    if (!['disable','enable','role','invite','recovery'].includes(action)) throw new Error('Invalid team action.');
    if (action==='role' && !['editor','author'].includes(String(role))) throw new Error('Choose Editor or Author.');
    if (action==='enable' && !account.hash) throw new Error('Send a new setup link for an account that has not activated.');
    if(action==='recovery'&&(account.status!=='active'||!account.hash||!account.secret))throw new Error('Only active team accounts can receive a password reset link. Use a setup invitation for a new account.');
    const updated:Account={...account,secret:action==='recovery'?account.secret:randomBytes(32).toString('hex')};
    delete updated.recoveryHash;delete updated.recoveryExpires;delete updated.recoveryBinding;
    let token;
    if (action==='disable') { updated.status='disabled'; delete updated.inviteHash; delete updated.inviteExpires; }
    if (action==='enable') updated.status='active';
    if (action==='role') updated.role=role as 'editor'|'author';
    if (action==='invite') { token=randomBytes(32).toString('hex'); updated.status='invited'; updated.inviteHash=createHash('sha256').update(token).digest('hex');updated.inviteExpires=Date.now()+7*24*60*60*1000; }
    if(action==='recovery'){token=randomBytes(32).toString('hex');updated.recoveryHash=createHash('sha256').update(token).digest('hex');updated.recoveryExpires=Date.now()+30*60*1000;updated.recoveryBinding=createHash('sha256').update(account.secret!).digest('hex');}
    await writeData('team.json',members.map(member=>member.id===id?updated:member));
    return {token,member:{...identity(updated),status:updated.status,createdAt:updated.createdAt}};
  });
}
export async function recoverStaffPassword(token:string,password:string){
  return serialized(async()=>{
    if(!/^[a-f0-9]{64}$/.test(token))throw new Error('Invalid team recovery link. Ask the owner for a new link.');
    const members=await accounts(),hash=createHash('sha256').update(token).digest('hex');
    const account=members.find(member=>member.status==='active'&&member.secret&&member.recoveryHash===hash&&(member.recoveryExpires||0)>Date.now()&&member.recoveryBinding===createHash('sha256').update(member.secret).digest('hex'));
    if(!account)throw new Error('This team recovery link is invalid, expired or already used. Ask the owner for a new link.');
    const updated:Account={...account,...passwordCredentials(password)};
    delete updated.recoveryHash;delete updated.recoveryExpires;delete updated.recoveryBinding;
    await writeData('team.json',members.map(member=>member.id===updated.id?updated:member));
    return updated;
  });
}
export async function changeStaffPassword(user: StaffIdentity,current: string,next: string) {
  return serialized(async()=>{
    const members=await accounts(), account=members.find(member=>member.id===user.id && member.status==='active');
    if (!account || !verifyCredentials(account,current)) throw new Error('Incorrect current password.');
    const updated={...account,...passwordCredentials(next)};
    delete updated.recoveryHash;delete updated.recoveryExpires;delete updated.recoveryBinding;
    await writeData('team.json',members.map(member=>member.id===user.id?updated:member)); return updated;
  });
}
export async function revokeStaffSessions(id: string) { await serialized(async()=>{const members=await accounts();await writeData('team.json',members.map(account=>account.id===id?{...account,secret:randomBytes(32).toString('hex')}:account));}); }
