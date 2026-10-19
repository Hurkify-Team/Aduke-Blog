export const postCategories = ['Music', 'Celebrities', 'Nollywood', 'Lifestyle', 'Entertainment News', 'Interviews', 'Videos'] as const;
export type Post = {
  id: string; slug: string; title: string; category: string; excerpt: string;
  body: string; author: string; cover: string; coverAlt: string; video: string;
  status: 'draft' | 'published'; featured: boolean; trending: boolean;
  createdAt: string; updatedAt: string; publishedAt: string | null; demo?: boolean;
};
export function slugify(title: string) {
  return title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}
export function postDate(post: Post) {
  return new Date(post.publishedAt || post.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
