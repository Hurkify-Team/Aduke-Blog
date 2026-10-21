import type { Metadata } from 'next';
import Admin from '@/components/Admin';
import { isOwner, ownerConfig } from '@/lib/auth';
import { allPosts, allCategories } from '@/lib/store';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Owner Dashboard | Aduke Radio Blog', robots: { index: false, follow: false } };
export default async function AdminPage() {
  const signedIn = await isOwner();
  return <Admin configured={!!await ownerConfig()} signedIn={signedIn} initialPosts={signedIn ? await allPosts() : []} initialCategories={await allCategories()} />;
}
