import { NextResponse } from 'next/server';
import { checkOrigin, isOwner } from '@/lib/auth';
import { teamList, inviteAccount, manageAccount } from '@/lib/accounts';
import { limitedJson } from '@/lib/request';
export const runtime='nodejs';
export async function GET() { if (!await isOwner()) return NextResponse.json({error:'Owner access required.'},{status:403});return NextResponse.json(await teamList(),{headers:{'Cache-Control':'no-store'}}); }
export async function POST(request:Request) {
  if (!await isOwner()) return NextResponse.json({error:'Owner access required.'},{status:403});
  try {
    checkOrigin(request);const input=await limitedJson(request,4096);
    const result=input.action==='invite' && input.id===undefined?await inviteAccount(input):typeof input.id==='string'?await manageAccount(input.id,String(input.action),input.role):null;
    if (!result) throw new Error('Invalid team action.');
    return NextResponse.json({member:result.member,...(result.token?{setupUrl:new URL('/admin/join#token='+result.token,request.url).href}:{})},{headers:{'Cache-Control':'no-store'}});
  } catch(error) {return NextResponse.json({error:error instanceof Error?error.message:'Could not update team access.'},{status:400});}
}
