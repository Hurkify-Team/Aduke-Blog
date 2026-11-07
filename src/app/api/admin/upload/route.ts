import { storeImage } from '@/lib/image-storage';
import { limitedBytes } from '@/lib/request';
import { NextResponse } from 'next/server';
import { checkOrigin, isStaff } from '@/lib/auth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!await isStaff()) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    checkOrigin(request);
    if (Number(request.headers.get('content-length')) > 4 * 1024 * 1024) throw new Error('Choose an image smaller than 3 MB.');
    const body = await limitedBytes(request, 4 * 1024 * 1024);
    const file = (await new Response(new Uint8Array(body), { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData()).get('image');
    if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP image smaller than 3 MB.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const url = await storeImage(bytes);
    return NextResponse.json({ url: url });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Image upload failed.' }, { status: 400 }); }
}
