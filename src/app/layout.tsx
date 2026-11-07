import type { Metadata } from 'next';
import { siteOrigin } from '@/lib/config';
import './globals.css';
import './publishing.css';
import './admin-polish.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: 'Aduke Radio Blog | Music, Stars & Stories',
  description: 'Your front-row seat to music, celebrities, Nollywood, lifestyle and culture. Aduke Radio Blog.',
  openGraph: { title: 'Aduke Radio Blog', description: 'The Sound. The Stars. The Stories.', type: 'website', images: ['/images/logo.png'] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.classList.toggle('dark',localStorage.getItem('aduke-theme')==='dark')}catch(e){}" }}/></head><body>{children}</body></html>;
}
