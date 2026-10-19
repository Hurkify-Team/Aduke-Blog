import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { checkOrigin, isOwner } from '@/lib/auth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!await isOwner()) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    checkOrigin(request);
    if (Number(request.headers.get('content-length')) > 6 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');
    const file = (await request.formData()).get('image');
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP image smaller than 5 MB.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'jpg' : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : null;
    if (!ext) throw new Error('Unsupported image. Use JPG, PNG or WebP.');
    const directory = path.join(process.cwd(), 'public', 'uploads'); await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    await writeFile(path.join(directory, filename), bytes, { flag: 'wx' });
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Image upload failed.' }, { status: 400 }); }
}
