export type PostSource = { url: string; title: string; publisher: string; publishedAt: string; importedAt: string };
export const postCategories = ['Music', 'Celebrities', 'Nollywood', 'Lifestyle', 'Entertainment News', 'Interviews', 'Videos', 'Sports'] as const;
export type Post = {
  id: string; slug: string; previousSlugs?: string[]; title: string; category: string; excerpt: string;
  createdBy?: string; updatedBy?: string; spotlight?: boolean; source?: PostSource; coverCredit?: { text: string; url: string };
  body: string; bodyFormat?: 'rich-v1'; author: string; cover: string; coverAlt: string; video: string;
  status: 'draft' | 'published' | 'archived'; featured: boolean; trending: boolean;
  createdAt: string; updatedAt: string; publishedAt: string | null; demo?: boolean;
};
export function slugify(title: string) {
  return title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}
export function postDate(post: Post) {
  return new Date(post.publishedAt || post.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function categoryName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Enter a category name.');
  const name = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 40 || /[\x00-\x1f<>/\\#?]/.test(name) || !slugify(name) || ['home','trending','all'].includes(name.toLowerCase())) throw new Error('Use a category name of 1-40 characters, without reserved names or special URL characters.');
  return name;
}
