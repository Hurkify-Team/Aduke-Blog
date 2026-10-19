import Homepage from '@/components/Homepage';
import { publishedPosts } from '@/lib/store';
export const dynamic = 'force-dynamic';
export default async function Page() { return <Homepage posts={await publishedPosts()} />; }
