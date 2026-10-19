import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allPosts, publishedPosts } from '@/lib/store';
import { demoPosts } from '@/lib/demo-posts';
import ArticlePage from '@/components/ArticlePage';
export const dynamic = 'force-dynamic';
async function findPost(slug: string) {
  const stored = (await allPosts()).find(p => p.slug === slug);
  return stored ? (stored.status === 'published' ? stored : undefined) : demoPosts.find(p => p.slug === slug);
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await findPost((await params).slug);
  if (!post) return { title: 'Story not found | Aduke Radio Blog' };
  return { title: `${post.title} | Aduke Radio Blog`, description: post.excerpt, alternates: { canonical: `/stories/${post.slug}` }, robots: post.demo ? { index: false, follow: false } : undefined, openGraph: { type: 'article', title: post.title, description: post.excerpt, images: post.cover ? [post.cover] : ['/images/logo.png'], publishedTime: post.publishedAt || undefined, authors: [post.author] } };
}
export default async function Story({ params }: { params: Promise<{ slug: string }> }) {
  const post = await findPost((await params).slug); if (!post) notFound();
  const published = await publishedPosts();
  const related = [...published, ...demoPosts].filter(p => p.slug !== post.slug).sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category));
  return <ArticlePage post={post} related={related}/>;
}
