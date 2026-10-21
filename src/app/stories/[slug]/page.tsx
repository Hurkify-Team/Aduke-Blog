import { showDemoContent, siteOrigin } from '@/lib/config';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { allPosts, publishedPosts } from '@/lib/store';
import { demoPosts } from '@/lib/demo-posts';
import ArticlePage from '@/components/ArticlePage';
export const dynamic = 'force-dynamic';
async function findPost(slug: string) {
  const stored = (await allPosts()).find(p => p.slug === slug);
  return stored ? (stored.status === 'published' ? stored : undefined) : showDemoContent ? demoPosts.find(p => p.slug === slug) : undefined;
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await findPost((await params).slug);
  if (!post) return { title: 'Story not found | Aduke Radio Blog' };
  return { title: `${post.title} | Aduke Radio Blog`, description: post.excerpt, alternates: { canonical: `/stories/${post.slug}` }, robots: post.demo ? { index: false, follow: false } : undefined, openGraph: { type: 'article', title: post.title, description: post.excerpt, images: post.cover ? [post.cover] : ['/images/logo.png'], publishedTime: post.publishedAt || undefined, authors: [post.author] } };
}
export default async function Story({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const post = await findPost(slug);
  if (!post) {
    const moved = (await publishedPosts()).find(p => p.previousSlugs?.includes(slug));
    if (moved) permanentRedirect(`/stories/${moved.slug}`);
    notFound();
  }
  const published = await publishedPosts();
  const related = [...published, ...(showDemoContent ? demoPosts : [])].filter(p => p.slug !== post.slug).sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category));
  const schema = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: post.title, description: post.excerpt, datePublished: post.publishedAt || undefined, dateModified: post.updatedAt, author: { '@type': 'Person', name: post.author }, publisher: { '@type': 'Organization', name: 'Aduke Radio Blog' }, mainEntityOfPage: `${siteOrigin()}/stories/${post.slug}`, ...(post.cover ? { image: [new URL(post.cover, siteOrigin()).href] } : {}) };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}/><ArticlePage post={post} related={related}/></>;
}
