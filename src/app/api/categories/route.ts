import { NextResponse } from 'next/server';
import { allCategories, createCategory } from '@/lib/store';
import { currentUser, checkOrigin } from '@/lib/auth';
import { limitedJson } from '@/lib/request';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() { return NextResponse.json(await allCategories(), {headers:{'Cache-Control':'no-store'}}); }
export async function POST(request: Request) {
  const user=await currentUser();
  if (!user) return NextResponse.json({error:'Please sign in.'},{status:401});
  if (user.role==='author') return NextResponse.json({error:'An editor or owner can create categories.'},{status:403});
  try { checkOrigin(request); const input = await limitedJson(request,1024); return NextResponse.json(await createCategory(input.name),{headers:{'Cache-Control':'no-store'}}); }
  catch(error) { return NextResponse.json({error:error instanceof Error ? error.message : 'Could not create category.'},{status:400}); }
}
