import { limitedJson } from '@/lib/request';
import { NextResponse } from 'next/server';
import { checkOrigin, isOwner } from '@/lib/auth';
import { allPosts, savePost, archivePost } from '@/lib/store';
export const runtime = 'nodejs';
export async function GET() {
  if (!await isOwner()) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  return NextResponse.json(await allPosts(), { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  if (!await isOwner()) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try { checkOrigin(request); if (Number(request.headers.get('content-length')) > 200000) throw new Error('Post is too large.');
    const input = await limitedJson(request, 200000);
    if (input.id !== undefined && typeof input.id !== 'string') throw new Error('Invalid post ID.');
    return NextResponse.json(await savePost(input, input.id), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save the post.' }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  if (!await isOwner()) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    checkOrigin(request);
    const input = await limitedJson(request, 4096);
    if (typeof input.id !== 'string' || typeof input.updatedAt !== 'string' || !['archive', 'restore'].includes(String(input.action))) throw new Error('Invalid story action.');
    return NextResponse.json(await archivePost(input.id, input.updatedAt, input.action === 'restore'), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update story.' }, { status: 400 }); }
}
