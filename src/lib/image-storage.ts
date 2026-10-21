import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { cloudEnabled, cloudRequest, uploadBucket } from './cloud';
export async function storeImage(bytes: Buffer) {
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) throw new Error('Choose an image smaller than 3 MB.');
    const ext = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'jpg' : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : null;
    if (!ext) throw new Error('Unsupported image. Use JPG, PNG or WebP.');
    const filename = `${randomUUID()}.${ext}`;
    if (cloudEnabled()) {
      await cloudRequest(`/storage/v1/object/${encodeURIComponent(uploadBucket())}/${filename}`, { method: 'POST', headers: { 'Content-Type': ext === 'jpg' ? 'image/jpeg' : `image/${ext}`, 'x-upsert': 'false' }, body: new Uint8Array(bytes) });
    } else {
      const directory = path.join(process.cwd(), 'public', 'uploads'); await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, filename), bytes, { flag: 'wx' });
    }
  return `/uploads/${filename}`;
}
