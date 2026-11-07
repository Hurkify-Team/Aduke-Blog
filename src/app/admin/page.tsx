import type { Metadata } from 'next';
import Admin from '@/components/Admin';
import { currentUser, ownerConfig } from '@/lib/auth';
import { canSeePost } from '@/types/team';
import { allPosts, allCategories } from '@/lib/store';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Newsroom | Aduke Radio Blog', robots: { index: false, follow: false } };
export default async function AdminPage() {
  const user = await currentUser();
  const signedIn = !!user;
  return <Admin configured={!!await ownerConfig()} signedIn={signedIn} user={user} initialPosts={user ? (await allPosts()).filter(post=>canSeePost(user,post)) : []} initialCategories={await allCategories()} />;
}
