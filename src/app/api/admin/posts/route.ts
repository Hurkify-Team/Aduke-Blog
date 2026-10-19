import { NextResponse } from 'next/server';
import { checkOrigin, isOwner } from '@/lib/auth';
import { allPosts, savePost } from '@/lib/store';
export const runtime = 'nodejs';
export async function GET() {
  if (!await isOwner()) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  return NextResponse.json(await allPosts(), { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  if (!await isOwner()) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try { checkOrigin(request); if (Number(request.headers.get('content-length')) > 200000) throw new Error('Post is too large.');
    const input = await request.json();
    if (input.id !== undefined && typeof input.id !== 'string') throw new Error('Invalid post ID.');
    return NextResponse.json(await savePost(input, input.id), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save the post.' }, { status: 400 }); }
}
