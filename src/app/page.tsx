import { Suspense } from 'react';
import { showDemoContent } from '@/lib/config';
import Homepage from '@/components/Homepage';
import { publishedPosts, allCategories } from '@/lib/store';
export const dynamic = 'force-dynamic';
export default async function Page() { return <Suspense><Homepage availableCategories={await allCategories()} posts={await publishedPosts()} showDemo={showDemoContent} /></Suspense>; }
