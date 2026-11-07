import 'server-only';
import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import ipaddr from 'ipaddr.js';
import type { LookupAddress } from 'node:dns';
import type { LookupFunction } from 'node:net';

// Modern Node requests all addresses for automatic IPv4/IPv6 selection.
// Return only the already-validated pinned address, in the requested shape.
export function pinnedLookup(address: LookupAddress | LookupAddress[]): LookupFunction {
  const addresses = Array.isArray(address) ? address : [address];
  return (_hostname, options, callback) => {
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  };
}

export function publicAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}
export function newsUrl(input: string): URL {
  if (input.length > 2048) throw new Error('The source address is too long.');
  let url: URL;
  try { url = new URL(input); } catch { throw new Error('Enter a complete https:// news article address.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port && !['80', '443'].includes(url.port)) throw new Error('Use a public http or https news URL with no credentials or custom port.');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.') && !ipaddr.isValid(host)) throw new Error('Only public news websites can be imported.');
  if (ipaddr.isValid(host) && !publicAddress(host)) throw new Error('Private and reserved network addresses are blocked.');
  url.hash = '';
  return url;
}
export async function publicPage(input: string, options: { maxBytes?: number; accept?: string; redirects?: number; beforeRedirect?: (url: URL) => Promise<void>; deadline?: number; image?: boolean; feed?: boolean } = {}): Promise<{ url: string; status: number; text: string; type: string; bytes: Buffer }> {
  const maxBytes = options.maxBytes || 1500000;
  const expires = options.deadline || Date.now() + 35000;
  let url = newsUrl(input);
  for (let redirect = 0; redirect <= (options.redirects ?? 4); redirect++) {
    if (Date.now() >= expires) throw new Error('Source request timed out.');
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = await new Promise<LookupAddress[]>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('The source website DNS lookup timed out. Try again or use another source.')), Math.max(1, Math.min(10000, expires - Date.now())));
      lookup(host, { all: true, verbatim: true }).then(resolve, reject).finally(() => clearTimeout(timer));
    });
    if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new Error('This URL resolves to a private or reserved address.');
    // Prefer IPv4 while retaining verified IPv6 alternatives for Node family fallback.
    addresses.sort((a, b) => a.family - b.family);
    const result = await new Promise<{ status: number; location?: string; text: string; type: string; bytes: Buffer }>((resolve, reject) => {
      const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
        agent: false, ...{ autoSelectFamily: true, autoSelectFamilyAttemptTimeout: 300 },
        headers: { 'User-Agent': 'AdukeNewsImporter/1.0', Accept: options.accept || 'text/html', 'Accept-Encoding': 'identity' },
        lookup: pinnedLookup(addresses),
      }, response => {
        const status = response.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status)) { response.resume(); resolve({ status, location: response.headers.location, text: '', type: '', bytes: Buffer.alloc(0) }); return; }
        const type = String(response.headers['content-type'] || '');
        if (!(options.image ? /^image\/(jpeg|png|webp)(;|$)/i.test(type) : options.feed ? /^(text\/(xml|plain)|application\/(rss\+xml|atom\+xml|xml))(;|$)/i.test(type) : /^(text\/html|application\/xhtml\+xml|text\/plain)/i.test(type))) { response.destroy(); reject(new Error('The address must return a readable article page.')); return; }
        if (Number(response.headers['content-length']) > maxBytes || response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') { response.destroy(); reject(new Error('The source response is too large or uses unsupported encoding.')); return; }
        const chunks: Buffer[] = []; let total = 0;
        response.on('data', chunk => { total += chunk.length; if (total > maxBytes) { response.destroy(new Error('The source page is too large.')); } else chunks.push(Buffer.from(chunk)); });
        response.on('end', () => resolve({ status, text: options.image ? '' : Buffer.concat(chunks).toString('utf8'), type, bytes: Buffer.concat(chunks) }));
        response.on('error', reject);
      });
      const deadline = setTimeout(() => request.destroy(new Error('The source website took too long to respond.')), Math.max(1, Math.min(20000, expires - Date.now())));
      request.on('close', () => clearTimeout(deadline));
      request.on('error', reject);
      request.end();
    });
    if (result.location) {
      const next = newsUrl(new URL(result.location, url).href);
      if (url.protocol === 'https:' && next.protocol !== 'https:') throw new Error('Insecure redirect refused.');
      await options.beforeRedirect?.(next);
      url = next; continue;
    }
    return { url: url.href, status: result.status, text: result.text, type: result.type, bytes: result.bytes };
  }
  throw new Error('The source redirected too many times.');
}
