import 'server-only';
import { createHash } from 'node:crypto';
import { newsUrl } from './safe-fetch';
import type { ExtractedNews } from './news-import';
export type VideoInput = { youtube?: string; bytes?: Buffer; mimeType?: string };
export function youtubeVideo(input: string): string | null {
  const url = newsUrl(input), host = url.hostname.toLowerCase();
  let id = '';
  if (host === 'youtu.be') id = url.pathname.slice(1);
  else if (['youtube.com','www.youtube.com','m.youtube.com'].includes(host)) id = url.pathname === '/watch' ? url.searchParams.get('v') || '' : url.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})\/?$/)?.[1] || '';
  return /^[\w-]{11}$/.test(id) ? 'https://www.youtube.com/watch?v=' + id : null;
}
export function videoMime(bytes: Buffer): string {
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) throw new Error('Choose a video clip smaller than 3 MB.');
  if (bytes.length >= 24 && bytes.toString('ascii',4,8) === 'ftyp') return bytes.toString('ascii',8,12) === 'qt  ' ? 'video/quicktime' : 'video/mp4';
  if (bytes.length >= 24 && bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))) return 'video/webm';
  throw new Error('Use an MP4, MOV or WebM video clip.');
}
export function videoSource(input: Record<string, unknown>, bytes?: Buffer): { news: ExtractedNews; video: VideoInput } {
  if (input.videoPermission !== true) throw new Error('Confirm you may submit this video for analysis.');
  const url = newsUrl(String(input.url || ''));
  const youtube = youtubeVideo(url.href);
  if (!youtube && !bytes) throw new Error('This platform cannot be analysed from a link alone. Upload a permitted MP4, MOV or WebM clip (up to 3 MB), keeping the original post link.');
  const title = typeof input.videoTitle === 'string' ? input.videoTitle.trim().slice(0,180) : '';
  const creator = typeof input.videoCreator === 'string' ? input.videoCreator.trim().slice(0,100) : '';
  const context = typeof input.videoContext === 'string' ? input.videoContext.trim() : '';
  if (context.length > 4000) throw new Error('Keep the optional caption/context under 4,000 characters.');
  const publisher = ((youtube ? 'YouTube' : url.hostname) + (creator ? ' / ' + creator : '')).slice(0,120);
  const video = bytes ? { bytes, mimeType: videoMime(bytes) } : { youtube: youtube! };
  const text = context || 'Analyse the supplied video. No independent reporting or verified background has been provided.';
  const fingerprint = createHash('sha256').update(JSON.stringify({url:url.href,title,creator,context,youtube:bytes ? null : youtube})).update(bytes || '').digest('hex');
  return { news: { source: { url: url.href, title: title || 'Video post from ' + publisher, publisher, publishedAt:'', importedAt:new Date().toISOString() }, text, fingerprint }, video };
}
