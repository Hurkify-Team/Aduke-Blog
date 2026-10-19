import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Post, postCategories, slugify } from '@/types/post';

export const dataDirectory = path.resolve(process.env.ADUKE_DATA_DIR || path.join(process.cwd(), 'data'));
// Single-process local store. Serialize mutations and atomically replace the file.
const globalStore = globalThis as typeof globalThis & { adukeWrites?: Promise<unknown> };
export async function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const result = (globalStore.adukeWrites || Promise.resolve()).then(fn, fn);
  globalStore.adukeWrites = result.catch(() => undefined);
  return result;
}
export async function readData<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await readFile(path.join(dataDirectory, file), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback; throw error; }
}
export async function writeData(file: string, value: unknown) {
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
  const category = field(input, 'category', 40);
  if (!postCategories.some(c => c === category)) throw new Error('Choose a valid category.');
  if (input.status !== 'draft' && input.status !== 'published') throw new Error('Invalid post status.');
  const excerpt = field(input, 'excerpt', 350), body = field(input, 'body', 100000), author = field(input, 'author', 100);
  const cover = field(input, 'cover', 180), coverAlt = field(input, 'coverAlt', 200), video = field(input, 'video', 300);
  if (cover && !/^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(cover)) throw new Error('Upload a cover image using the image picker.');
  if (cover && !coverAlt) throw new Error('Describe your cover image for readers using screen readers.');
  if (video && !youtubeId(video)) throw new Error('Enter a valid YouTube video URL.');
  if (input.status === 'published' && (!excerpt || body.length < 50 || !author)) throw new Error('Publishing requires an excerpt, author and at least 50 characters of article text.');
  const now = new Date().toISOString();
  return { id: old?.id || randomUUID(), slug, title, category, excerpt, body, author, cover, coverAlt, video, status: input.status, featured: input.featured === true, trending: input.trending === true, createdAt: old?.createdAt || now, updatedAt: now, publishedAt: input.status === 'published' ? old?.publishedAt || now : null };
}
export function youtubeId(value: string) {
  try { const url = new URL(value); if (url.protocol !== 'https:') return null;
    const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : ['youtube.com', 'www.youtube.com'].includes(url.hostname) ? url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1] : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
export async function savePost(input: Record<string, unknown>, id?: string) {
  return serialized(async () => {
    const posts = await allPosts(); const old = id ? posts.find(p => p.id === id) : undefined;
    if (id && !old) throw new Error('Post not found.');
    if (old && input.updatedAt !== old.updatedAt) throw new Error('This post changed in another window. Reload it before saving.');
    const post = validatePost(input, old);
    if (posts.some(p => p.slug === post.slug && p.id !== post.id)) throw new Error('That URL slug is already in use.');
    if (post.featured && post.status === 'published') posts.forEach(p => { if (p.id !== post.id) p.featured = false; });
    await writeData('posts.json', [...posts.filter(p => p.id !== post.id), post]);
    return post;
  });
}
