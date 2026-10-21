import { publicPage } from '@/lib/safe-fetch';
import { storeImage } from '@/lib/image-storage';
import sharp from 'sharp';
import { NextResponse } from 'next/server';
import { isOwner, checkOrigin } from '@/lib/auth';
import { videoSource } from '@/lib/video-import';
import { limitedBytes, limitedJson } from '@/lib/request';
import { fetchNews, writeNewsDraft } from '@/lib/news-import';
import { readData, serialized, writeData, allCategories } from '@/lib/store';
export const runtime = 'nodejs';
export const maxDuration = 120;
async function claimImport() {
  return serialized(async () => {
    let limit = await readData('import-limit.json', { count: 0, reset: 0 });
    if (limit.reset < Date.now()) limit = { count: 0, reset: Date.now() + 60 * 60 * 1000 };
    if (limit.count >= 24) return false;
    await writeData('import-limit.json', { ...limit, count: limit.count + 1 }); return true;
  });
}
export async function GET() {
  if (!await isOwner()) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  return NextResponse.json({ configured: !!process.env.GEMINI_API_KEY }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  if (!await isOwner()) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  let stage = 'starting the import';
  try {
    checkOrigin(request);
    let input: Record<string, unknown>;
    let videoBytes: Buffer | undefined;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.startsWith('multipart/form-data')) {
      const bytes = await limitedBytes(request, 4 * 1024 * 1024);
      const form = await new Response(new Uint8Array(bytes), { headers: { 'Content-Type': contentType } }).formData();
      const metadata = form.get('metadata');
      if (typeof metadata !== 'string' || metadata.length > 12000) throw new Error('Invalid video import details.');
      const parsed: unknown = JSON.parse(metadata);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid import details.');
      input = parsed as Record<string, unknown>;
      const clip = form.get('clip');
      if (clip instanceof File) { if (clip.size > 3 * 1024 * 1024) throw new Error('Choose a video clip smaller than 3 MB.'); videoBytes = Buffer.from(await clip.arrayBuffer()); }
    } else input = await limitedJson(request, 12000);
    if (typeof input.url !== 'string' || !['preview', 'draft'].includes(String(input.action))) throw new Error('Enter a valid article URL and action.');
    if (input.action === 'draft' && !process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'Automatic rewriting needs GEMINI_API_KEY in the server environment. Add it privately to .env.local or your hosting settings, then restart.', code: 'NOT_CONFIGURED' }, { status: 503 });
    stage = 'checking newsroom storage';
    if (!await claimImport()) return NextResponse.json({ error: 'The hourly import limit has been reached. Please try later.' }, { status: 429 });
    const prepared = input.mode === 'video' ? videoSource(input, videoBytes) : null;
    stage = 'fetching the source article';
    const news = prepared ? prepared.news : await fetchNews(input.url);
    if (input.action === 'preview' && prepared) return NextResponse.json({ source: news.source, fingerprint: news.fingerprint, configured: !!process.env.GEMINI_API_KEY, image: '', imagePreview: '', imageNotice: 'Choose a permitted cover photograph in the editor after generation.', videoReady: true }, { headers: { 'Cache-Control': 'no-store' } });
    if (input.action === 'preview') {
      let imagePreview = '', imageNotice = '';
      if (news.image) {
        try {
          const image = await publicPage(news.image, { image: true, maxBytes: 3 * 1024 * 1024, accept: 'image/jpeg,image/png,image/webp', deadline: Date.now() + 7000 });
          if (image.status !== 200) throw new Error('Unavailable photograph');
          const thumbnail = await sharp(image.bytes, { limitInputPixels: 40000000 }).resize({ width: 600, height: 400, fit: 'inside', withoutEnlargement: true }).jpeg().toBuffer();
          imagePreview = 'data:image/jpeg;base64,' + thumbnail.toString('base64');
        } catch { imageNotice = 'The source photograph could not be previewed. Upload a permitted JPG, PNG or WebP instead.'; }
      }
      return NextResponse.json({ source: news.source, fingerprint: news.fingerprint, configured: !!process.env.GEMINI_API_KEY, image: imagePreview ? news.image : '', imagePreview, imageNotice, imageCredit: news.imageCredit, wordCount: news.text.trim().split(/\s+/).length }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (input.fingerprint !== news.fingerprint) throw new Error('The source changed since preview. Preview it again before generating a draft.');
    let cover = '', coverAlt = '', coverCredit;
    let selectedImage: Buffer | undefined;
    stage = 'fetching the selected source photograph';
    if (input.useSourceImage === true) {
      if (input.imagePermission !== true || !news.image || input.image !== news.image) throw new Error('Preview the photograph again and confirm that you have reuse permission.');
      if (input.imageCredit !== undefined && (typeof input.imageCredit !== 'string' || input.imageCredit.length > 200)) throw new Error('Add a photographer/source credit, including any required licence information.');
      const image = await publicPage(news.image, { image: true, maxBytes: 3 * 1024 * 1024, accept: 'image/jpeg,image/png,image/webp' });
      if (image.status !== 200) throw new Error('The source photograph is unavailable. Upload a permitted photograph instead.');
      await sharp(image.bytes, { limitInputPixels: 40000000 }).metadata();
      selectedImage = image.bytes;
      coverAlt = news.source.title.slice(0, 200);
      coverCredit = { text: typeof input.imageCredit === 'string' && input.imageCredit.trim() ? input.imageCredit.trim() : news.imageCredit?.text || 'Image via ' + news.source.publisher, url: news.imageCredit?.url || news.source.url };
    }
    stage = 'generating the story with Gemini';
    const summary = await writeNewsDraft(news, prepared?.video, await allCategories());
    if (selectedImage) cover = await storeImage(selectedImage);
    const body = JSON.stringify({ type: 'doc', content: summary.paragraphs.map(text => ({ type: 'paragraph', content: [{ type: 'text', text }] })) });
    return NextResponse.json({ draft: { title: summary.title, excerpt: summary.excerpt, category: summary.category, body, bodyFormat: 'rich-v1', source: news.source, author: 'Aduke Editorial Team', status: 'draft', cover, coverAlt, coverCredit, video: prepared?.video.youtube || '', featured: false, trending: false }, reviewNotes: summary.reviewNotes }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not import this article.';
    const timeout = error instanceof Error && (['TimeoutError', 'AbortError'].includes(error.name) || /timed? ?out|timeout|took too long/i.test(message));
    return NextResponse.json({ error: timeout ? `Timed out while ${stage}. ${stage.includes('Gemini') ? 'Try again, or use a shorter video clip.' : 'The source or its network is responding slowly. Try again or use another public source link.'}` : message, code: timeout ? 'IMPORT_TIMEOUT' : 'IMPORT_FAILED' }, { status: timeout ? 504 : 400 });
  }
}
