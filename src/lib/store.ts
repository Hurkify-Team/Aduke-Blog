import { canManagePost, type StaffIdentity } from '@/types/team';
import { bodyText, richBodyFormat, validateRichBody } from './rich-text';
import { cloudEnabled, cloudRead, cloudWrite, cloudTransaction } from './cloud';
import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Post, PostSource, postCategories, categoryName, slugify } from '@/types/post';

export const dataDirectory = path.resolve(process.env.ADUKE_DATA_DIR || path.join(process.cwd(), 'data'));
// Single-process local store. Serialize mutations and atomically replace the file.
const globalStore = globalThis as typeof globalThis & { adukeWrites?: Promise<unknown> };
export async function serialized<T>(fn: () => Promise<T>): Promise<T> {
  if (cloudEnabled()) return cloudTransaction(fn);
  const result = (globalStore.adukeWrites || Promise.resolve()).then(fn, fn);
  globalStore.adukeWrites = result.catch(() => undefined);
  return result;
}
export async function readData<T>(file: string, fallback: T): Promise<T> {
  if (cloudEnabled()) return cloudRead(file, fallback);
  try { return JSON.parse(await readFile(path.join(dataDirectory, file), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback; throw error; }
}
export async function writeData(file: string, value: unknown) {
  if (cloudEnabled()) return cloudWrite(file, value);
  await mkdir(dataDirectory, { recursive: true });
  const target = path.join(dataDirectory, file);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(temporary, target);
}
export async function allPosts(): Promise<Post[]> {
  return (await readData<Post[]>('posts.json', [])).sort((a, b) => (b.publishedAt || b.updatedAt).localeCompare(a.publishedAt || a.updatedAt));
}
export async function publishedPosts() { return (await allPosts()).filter(p => p.status === 'published'); }
function referenceUrl(value: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use a valid public source URL.');
  return url;
}
function field(input: Record<string, unknown>, name: string, limit: number) {
  if (typeof input[name] !== 'string') return '';
  const value = (input[name] as string).trim();
  if (value.length > limit) throw new Error(`${name} is too long (maximum ${limit} characters).`);
  return value;
}
export function validatePost(input: Record<string, unknown>, old?: Post): Post {
  const title = field(input, 'title', 180);
  if (title.length < 3) throw new Error('Enter a title of at least 3 characters.');
  const slug = slugify(field(input, 'slug', 100) || title);
  if (!slug) throw new Error('Enter a URL slug containing letters or numbers.');
  const category = categoryName(input.category);
  if (input.status !== 'draft' && input.status !== 'published') throw new Error('Invalid post status.');
  const excerpt = field(input, 'excerpt', 350), body = field(input, 'body', 100000), author = field(input, 'author', 100);
  if (input.bodyFormat !== undefined && input.bodyFormat !== richBodyFormat) throw new Error('Unsupported article format.');
  const bodyFormat = input.bodyFormat === richBodyFormat ? richBodyFormat : undefined;
  if (bodyFormat) validateRichBody(body);
  const cover = field(input, 'cover', 180), coverAlt = field(input, 'coverAlt', 200), video = field(input, 'video', 300);
  if (cover && !/^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(cover)) throw new Error('Upload a cover image using the image picker.');
  if (cover && !coverAlt) throw new Error('Describe your cover image for readers using screen readers.');
  if (video && !youtubeId(video)) throw new Error('Enter a valid YouTube video URL.');
  if (input.status === 'published' && (!excerpt || bodyText(body, bodyFormat).trim().length < 50 || !author)) throw new Error('Publishing requires an excerpt, author and at least 50 characters of article text.');
  let source: PostSource | undefined = old?.source;
  if (!source && input.source !== undefined) {
    if (!input.source || typeof input.source !== 'object' || Array.isArray(input.source)) throw new Error('Invalid source details.');
    const details = input.source as Record<string, unknown>;
    source = { url: referenceUrl(field(details, 'url', 2048)).href, title: field(details, 'title', 300), publisher: field(details, 'publisher', 120), publishedAt: field(details, 'publishedAt', 40), importedAt: field(details, 'importedAt', 40) };
    if (!source.title || !source.publisher || !source.importedAt || Number.isNaN(Date.parse(source.importedAt)) || source.publishedAt && Number.isNaN(Date.parse(source.publishedAt))) throw new Error('Incomplete source attribution.');
  }
  let coverCredit;
  if (input.coverCredit && cover) {
    if (typeof input.coverCredit !== 'object' || Array.isArray(input.coverCredit)) throw new Error('Invalid photograph credit.');
    const credit = input.coverCredit as Record<string, unknown>;
    const text = field(credit, 'text', 200), url = field(credit, 'url', 2048);
    if (text) coverCredit = { text, url: url ? referenceUrl(url).href : '' };
  }
  const spotlight = input.spotlight === true || (input.spotlight === undefined && old?.spotlight === undefined && old?.featured === true && category === 'Music');
  if (spotlight && input.featured === true && (category !== 'Music' || (input.status === 'published' && !cover))) throw new Error('Artist Spotlight requires the Music category and a cover photograph.');
  const now = new Date(Math.max(Date.now(), old ? Date.parse(old.updatedAt) + 1 : 0)).toISOString();
  return { id: old?.id || randomUUID(), slug, previousSlugs: old ? [...new Set([...(old.previousSlugs || []), ...(old.publishedAt && old.slug !== slug ? [old.slug] : [])])].filter(value => value !== slug) : [], title, category, excerpt, source, coverCredit, body: bodyFormat ? JSON.stringify(validateRichBody(body)) : body, bodyFormat, author, cover, coverAlt, video, status: input.status, spotlight, createdBy: old?.createdBy, updatedBy: old?.updatedBy, featured: input.featured === true, trending: input.trending === true, createdAt: old?.createdAt || now, updatedAt: now, publishedAt: old?.publishedAt || (input.status === 'published' ? now : null) };
}
export function youtubeId(value: string) {
  try { const url = new URL(value); if (url.protocol !== 'https:') return null;
    const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : ['youtube.com', 'www.youtube.com'].includes(url.hostname) ? url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1] : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
export async function savePost(input: Record<string, unknown>, id?: string, actor?: StaffIdentity) {
  return serialized(async () => {
    const posts = await allPosts(); const old = id ? posts.find(p => p.id === id) : undefined;
    if (id && !old) throw new Error('Post not found.');
    if (actor && old && !canManagePost(actor,old)) throw new Error('You can edit only your own unpublished stories.');
    if (actor?.role === 'author' && (input.status !== 'draft' || input.featured === true || input.trending === true || input.spotlight === true)) throw new Error('Authors save drafts for an editor to review and publish.');
    if (old?.status === 'archived') throw new Error('Restore this story to drafts before editing it.');
    if (old && input.updatedAt !== old.updatedAt) throw new Error('This post changed in another window. Reload it before saving.');
    const post = validatePost(input, old);
    post.createdBy = old?.createdBy || (old ? 'owner' : actor?.id || 'owner');
    post.updatedBy = actor?.id || old?.updatedBy || 'owner';
    if (!(await allCategories()).includes(post.category)) throw new Error('Create or select an existing category before saving.');
    if (posts.some(p => p.id !== post.id && (p.slug === post.slug || p.previousSlugs?.includes(post.slug)))) throw new Error('That URL slug is already in use.');
    if (post.featured && post.status === 'published') posts.forEach(p => { if (p.id !== post.id && p.featured) { p.featured = false; p.spotlight = false; p.updatedBy = actor?.id || 'owner'; p.updatedAt = new Date(Math.max(Date.now(), Date.parse(p.updatedAt) + 1)).toISOString(); } });
    await writeData('posts.json', [...posts.filter(p => p.id !== post.id), post]);
    return post;
  });
}

export async function archivePost(id: string, updatedAt: string, restore: boolean, actor?: StaffIdentity) {
  return serialized(async () => {
    const posts = await allPosts();
    const post = posts.find(item => item.id === id);
    if (!post) throw new Error('Post not found.');
    if (actor && !canManagePost(actor,post)) throw new Error('You can archive only your own unpublished stories.');
    if (post.updatedAt !== updatedAt) throw new Error('This post changed in another window. Reload it before continuing.');
    if (restore && post.status !== 'archived') throw new Error('This story is not archived.');
    if (!restore && post.status === 'archived') throw new Error('This story is already archived.');
    const updated: Post = { ...post, status: restore ? 'draft' : 'archived', featured: false, spotlight: false, trending: false, updatedBy: actor?.id || 'owner', updatedAt: new Date(Math.max(Date.now(), Date.parse(post.updatedAt) + 1)).toISOString() };
    await writeData('posts.json', posts.map(item => item.id === id ? updated : item));
    return updated;
  });
}

export async function allCategories(): Promise<string[]> {
  const custom = await readData<string[]>('categories.json', []);
  const result: string[] = [];
  for (const value of [...postCategories, ...custom, ...(await allPosts()).map(post => post.category)]) {
    const name = categoryName(value);
    if (!result.some(item => item.toLowerCase() === name.toLowerCase())) result.push(name);
  }
  return result;
}
export async function createCategory(value: unknown) {
  return serialized(async () => {
    const name = categoryName(value);
    const categories = await allCategories();
    const existing = categories.find(item => item.toLowerCase() === name.toLowerCase());
    if (existing) return { name: existing, categories };
    if (categories.length >= 100) throw new Error('The category limit of 100 has been reached.');
    const custom = await readData<string[]>('categories.json', []);
    await writeData('categories.json', [...custom, name]);
    return { name, categories: [...categories, name] };
  });
}
