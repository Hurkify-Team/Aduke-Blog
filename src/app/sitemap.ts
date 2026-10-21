import type { MetadataRoute } from 'next';
import { publishedPosts } from '@/lib/store';
import { siteOrigin } from '@/lib/config';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  return [{ url: origin, changeFrequency: 'daily', priority: 1 }, ...(await publishedPosts()).map(post => ({ url: `${origin}/stories/${post.slug}`, lastModified: post.updatedAt, changeFrequency: 'weekly' as const, priority: 0.7 }))];
}
