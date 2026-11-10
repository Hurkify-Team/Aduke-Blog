import type { Metadata } from 'next';
import Admin from '@/components/Admin';
import { currentUser, ownerConfig } from '@/lib/auth';
import { canSeePost } from '@/types/team';
import { allPosts, allCategories } from '@/lib/store';
import { emailRecoveryConfigured,normalEmail } from '@/lib/recovery-email';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Newsroom | Aduke Radio Blog', robots: { index: false, follow: false } };
export default async function AdminPage() {
  const user = await currentUser();
  const signedIn = !!user;
  const address=user?.role==='owner'?normalEmail(process.env.OWNER_RECOVERY_EMAIL):'';
  const masked=address?address.slice(0,2)+'***@'+address.split('@')[1]:'';
  return <Admin configured={!!await ownerConfig()} signedIn={signedIn} user={user} ownerRecoveryReady={user?.role==='owner'&&emailRecoveryConfigured()} ownerRecoveryEmail={masked} initialPosts={user ? (await allPosts()).filter(post=>canSeePost(user,post)) : []} initialCategories={await allCategories()} />;
}
