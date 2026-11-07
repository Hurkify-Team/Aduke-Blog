import { canSeePost } from '@/types/team';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { allPosts, publishedPosts } from '@/lib/store';
import ArticlePage from '@/components/ArticlePage';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Private story preview | Aduke Radio Blog', robots: { index: false, follow: false } };
export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/admin');
  // Resolve only after authorization so drafts never reach public page props.
  const id = (await params).id;
  const draft = (await allPosts()).find(p => p.id === id); if (!draft || !canSeePost(user,draft)) notFound();
  return <ArticlePage post={draft} preview related={(await publishedPosts()).filter(p => p.id !== id)}/>;
}
