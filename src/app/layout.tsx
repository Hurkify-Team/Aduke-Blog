import type { Metadata } from 'next';
import './globals.css';
import './publishing.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Aduke Radio Blog | Music, Stars & Stories',
  description: 'Your front-row seat to music, celebrities, Nollywood, lifestyle and culture. Aduke Radio Blog homepage preview.',
  openGraph: { title: 'Aduke Radio Blog', description: 'The Sound. The Stars. The Stories.', type: 'website', images: ['/images/logo.png'] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
