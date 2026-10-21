import { cloudEnabled, cloudRequest, uploadBucket } from '@/lib/cloud';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(filename)) return new Response('Not found', { status: 404 });
  try {
    const bytes = cloudEnabled()
      ? new Uint8Array(await (await cloudRequest(`/storage/v1/object/authenticated/${encodeURIComponent(uploadBucket())}/${filename}`)).arrayBuffer())
      : await readFile(path.join(process.cwd(), 'public', 'uploads', filename));
    const extension = filename.split('.').pop();
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': extension === 'jpg' ? 'image/jpeg' : `image/${extension}`, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Response('Not found', { status: 404 });
    return new Response('Image unavailable', { status: 500 });
  }
}
