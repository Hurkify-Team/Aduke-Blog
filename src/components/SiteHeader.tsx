'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Headphones, Menu, Radio, Search, X } from 'lucide-react';
import { postCategories } from '@/types/post';
export default function SiteHeader() {
  const [menu, setMenu] = useState(false), [search, setSearch] = useState(false), [query, setQuery] = useState('');
  return <><div className="utility"><div className="utility-inner"><span className="tagline"><Headphones size={13}/> Stay Tuned. Stay Entertained.</span><Link href="/admin">Owner sign in</Link></div></div><header className="header"><div className="header-inner"><Link href="/" className="logo"><Image src="/images/logo.png" alt="Aduke Radio Blog" width={2172} height={724} priority/></Link><nav className={menu ? 'main-nav open reading-nav' : 'main-nav reading-nav'} aria-label="Main navigation"><Link href="/">Home</Link>{postCategories.map(c => <Link key={c} href={`/?category=${encodeURIComponent(c)}#latest`}>{c}</Link>)}</nav><div className="header-actions"><button aria-label="Search stories" aria-expanded={search} onClick={() => setSearch(!search)}><Search size={22}/></button><Link className="radio-button" href="/#radio"><Radio size={18}/> Live Radio</Link><button className="mobile-toggle" aria-label="Toggle navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div></div>{search && <form action="/" className="search-panel"><label htmlFor="article-search">Search stories</label><input id="article-search" name="search" value={query} onChange={e => setQuery(e.target.value)} autoFocus placeholder="Search music, stars, stories…"/><button type="submit">Search</button></form>}</header></>;
}
