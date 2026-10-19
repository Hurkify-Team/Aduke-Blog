import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
export default function NotFound() {
  return <><SiteHeader/><main className="story-not-found"><h1>This story isn’t available.</h1><p>It may be unpublished, or the link may have changed.</p><Link className="primary-button" href="/">Back to the homepage</Link></main></>;
}
