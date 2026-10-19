'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, AudioLines, BarChart3, ChevronDown, ChevronLeft, ChevronRight, Clapperboard, Flame, Gamepad2, Headphones, Heart, Instagram, Menu, Mic, Moon, Music, Pause, Play, Radio, Search, Star, Sun, X, Youtube } from 'lucide-react';
import { articles as demoArticles, editorials, featured as demoFeatured, trending as demoTrending } from '@/data/homepage';

import { Post, postDate, slugify } from '@/types/post';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const categories = ['Music', 'Celebrities', 'Nollywood', 'Lifestyle', 'Entertainment News', 'Interviews', 'Videos', 'Trending'];
const icons = [Music, Star, Clapperboard, Heart, Gamepad2, Mic, Play, BarChart3];
const demoTicker = ['Wizkid hints at new album', 'Nollywood stars shine at AMVCA 2024', 'Davido’s latest single breaks records', 'Top 10 viral moments this week'];

function Placeholder({ label, className = '', cover, coverAlt }: { label: string; className?: string; cover?: string; coverAlt?: string }) {
  if (cover) return <div className={`photo-placeholder ${className}`}><Image src={cover} alt={coverAlt || label} fill unoptimized sizes="(max-width:700px) 100vw, 33vw" style={{ objectFit: 'cover' }}/></div>;
  return <div className={`photo-placeholder ${className}`} role="img" aria-label={`${label} — original photo not supplied`}><span>Photo pending</span></div>;
}
function Badge({ children }: { children: React.ReactNode }) { return <span className="badge">{children}</span>; }

export default function Homepage({ posts = [] }: { posts?: Post[] }) {
  const router = useRouter();
  const articles = [...posts.map(p => ({ ...p, time: postDate(p) })), ...demoArticles.map(p => ({ ...p, slug: slugify(p.title), cover: '', coverAlt: '', demo: true }))];
  const featured = [...posts.filter(p => p.featured || p.trending).map(p => ({ ...p, time: postDate(p) })), ...demoFeatured.map(p => ({ ...p, cover: '', coverAlt: '' }))].slice(0, 3);
  const trendingPosts = posts.filter(p => p.trending);
  const trending = [...trendingPosts.map(p => p.title), ...demoTrending].slice(0, 4);
  const ticker = [...trendingPosts.map(p => p.title), ...posts.filter(p => !p.trending).map(p => p.title), ...demoTicker].slice(0, 4);
  const hero = posts.find(p => p.featured);

  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Home');
  const [tick, setTick] = useState(0);
  const [dialog, setDialog] = useState<{ title: string; text: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const stream = process.env.NEXT_PUBLIC_RADIO_STREAM_URL;
  useEffect(() => { setDark(localStorage.getItem('aduke-theme') === 'dark'); const params = new URLSearchParams(window.location.search); const chosen = params.get('category'); if (chosen && categories.includes(chosen)) setCategory(chosen); if (params.get('search')) setQuery(params.get('search') || ''); }, []);
  useEffect(() => { if (dialog) modal.current?.showModal(); else modal.current?.close(); }, [dialog]);
  function select(value: string) { setCategory(value); setMenu(false); setMore(false); document.getElementById('latest')?.scrollIntoView({ behavior: 'smooth' }); }
  function story(title: string) {
    const post = posts.find(p => p.title === title);
    const aliases: Record<string, string> = { [demoTicker[0]]: demoArticles[0].title, [demoTicker[1]]: demoTrending[0], [demoTicker[2]]: demoArticles[2].title, [demoTicker[3]]: demoTrending[1] };
    router.push(`/stories/${post?.slug || slugify(aliases[title] || title)}`);
  }
  const filtered = articles.filter(a => (category === 'Home' || (category === 'Trending' && (!('trending' in a) || a.trending)) || a.category === category) && `${a.title} ${a.category}`.toLowerCase().includes(query.toLowerCase()));
  async function toggleRadio() {
    if (!stream) { setDialog({ title: 'Live radio is not connected', text: 'The player is a preview. A verified radio streaming URL is required before listening is available.' }); return; }
    if (playing) { audio.current?.pause(); setPlaying(false); }
    else { try { await audio.current?.play(); setPlaying(true); } catch { setDialog({ title: 'Stream unavailable', text: 'The radio stream could not be played. Please try again later.' }); } }
  }
  return <div className={dark ? 'site dark' : 'site'}>
    <a className="skip-link" href="#latest">Skip to latest stories</a>
    <div className="utility"><div className="utility-inner"><span className="tagline"><Headphones size={13} /> Stay Tuned. Stay Entertained.</span><div className="utility-links">{['About', 'Advertise', 'Contact'].map(x => <button key={x} onClick={() => setDialog({ title: x, text: `${x} information will be available when the Aduke Radio Blog editorial service is connected. This is a homepage demonstration.` })}>{x}</button>)}<span className="separator"/><div className="socials"><span aria-label="Facebook">f</span><span aria-label="X">𝕏</span><Instagram size={15}/><Youtube size={16}/><span aria-label="TikTok">♪</span></div><span className="separator"/><button className="theme-toggle" aria-label="Toggle color theme" onClick={() => { setDark(!dark); localStorage.setItem('aduke-theme', dark ? 'light' : 'dark'); }}><Moon size={15}/><Sun size={13}/></button></div></div></div>
    <header className="header"><div className="header-inner"><a href="#" className="logo" aria-label="Aduke Radio Blog home" onClick={() => setCategory('Home')}><Image src="/images/logo.png" alt="Aduke Radio Blog" width={2172} height={724} priority /></a><nav aria-label="Main navigation" className={menu ? 'main-nav open' : 'main-nav'}>{['Home', ...categories.slice(0, 7)].map(x => <button className={category === x ? 'active' : ''} key={x} onClick={() => select(x)}>{x}</button>)}<div className="more-wrap"><button aria-expanded={more} onClick={() => setMore(!more)}>More <ChevronDown size={12}/></button>{more && <div className="more-menu"><button onClick={() => select('Trending')}>Trending</button><button onClick={() => setDialog({ title: 'About Aduke', text: 'Aduke Radio Blog brings music, entertainment, and culture together. Homepage demonstration.' })}>About Aduke</button></div>}</div></nav><div className="header-actions"><button className="search-button" aria-label="Search stories" aria-expanded={search} onClick={() => setSearch(!search)}><Search size={23}/></button><button className="radio-button" onClick={() => document.getElementById('radio')?.scrollIntoView({ behavior: 'smooth' })}><Radio size={18}/> Live Radio</button><button className="mobile-toggle" aria-label="Toggle navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div></div>{search && <form className="search-panel" onSubmit={e => { e.preventDefault(); document.getElementById('latest')?.scrollIntoView({ behavior: 'smooth' }); }}><label htmlFor="search">Search stories</label><input autoFocus id="search" value={query} onChange={e => { setQuery(e.target.value); setCategory('Home'); }} placeholder="Search music, stars, stories…"/><button type="submit"><Search size={18}/> Search</button><button type="button" aria-label="Close search" onClick={() => { setSearch(false); setQuery(''); }}><X size={18}/></button></form>}</header>
    <section className="ticker" aria-label="Trending headlines"><div className="ticker-label"><Flame size={17} fill="currentColor"/> TRENDING NOW</div><div className="ticker-headlines">{ticker.map((_, i) => <button key={i} onClick={() => story(ticker[(i + tick) % ticker.length])}>{ticker[(i + tick) % ticker.length]}</button>)}</div><div className="ticker-controls"><button aria-label="Previous headlines" onClick={() => setTick((tick + 3) % 4)}><ChevronLeft size={18}/></button><button aria-label="Next headlines" onClick={() => setTick((tick + 1) % 4)}><ChevronRight size={18}/></button></div></section>
    <section className="hero"><div className="hero-art" role="img" aria-label={hero?.coverAlt || "Featured artist photograph placeholder"}>{hero?.cover ? <Image src={hero.cover} alt={hero.coverAlt} fill unoptimized priority sizes="100vw" style={{ objectFit: "cover", objectPosition: "center" }}/> : <span>Featured artist photo pending</span>}</div><div className="hero-inner"><div className="hero-copy"><Badge>Featured Story</Badge><h1 className={hero ? "published-hero-title" : undefined}>{hero ? hero.title : <>The Sound,<br/>The Stars,<br/><em>The Stories.</em></>}</h1><p>{hero ? hero.excerpt : <>Your front-row seat to everything<br className="desktop-break"/> entertainment. Music. Celebrities.<br className="desktop-break"/> Nollywood. Lifestyle. Culture. And more.</>}</p><button className="primary-button" onClick={() => story(hero?.title || 'The Sound, The Stars, The Stories. Blog feature')}>Read Full Story <ArrowRight size={18}/></button></div><div className="featured-list">{featured.map(a => <button className="featured-story" key={a.id} onClick={() => story(a.title)}><Placeholder label={a.title} className={`featured-photo tone-${a.id}`} cover={a.cover} coverAlt={a.coverAlt}/><div><Badge>{a.category}</Badge><h2>{a.title}</h2><time>{a.time}</time></div></button>)}</div></div></section>
    <main className="page-content"><nav className="category-nav" aria-label="Entertainment categories">{categories.map((x, i) => { const Icon = icons[i]; return <button aria-pressed={category === x} className={category === x ? 'selected' : ''} key={x} onClick={() => select(x)}><Icon size={27} fill={i === 1 || i === 3 ? 'currentColor' : 'none'}/>{x}</button>; })}</nav><div className="content-grid"><div><section id="latest" className="latest"><div className="section-heading"><h2>{category === 'Home' || category === 'Trending' ? 'Latest Stories' : category}<span className="coral-dot"/></h2><button onClick={() => { setCategory('Home'); setQuery(''); }}>View All <ArrowRight size={15}/></button></div><div className="article-grid">{filtered.map(a => <article className="article-card" key={a.id}><button className="article-link" onClick={() => story(a.title)}><Placeholder label={a.title} className={`article-photo tone-${a.id}`} cover={a.cover} coverAlt={a.coverAlt}/><div className="article-content"><div className="article-meta"><Badge>{a.category}</Badge><time>{a.time}</time></div>{a.demo && <span className="card-demo-label">Design demonstration</span>}<h3>{a.title}</h3><p>{a.excerpt}</p></div></button></article>)}</div>{filtered.length === 0 && <div className="empty-state">No stories in this selection yet. <button onClick={() => { setCategory('Home'); setQuery(''); }}>Show all stories →</button></div>}</section><section className="editorials" aria-label="Explore Aduke">{editorials.map(([title, text, cta, cat], i) => <button className={`editorial tone-${i + 1}`} key={title} onClick={() => select(cat)}><span className="tile-placeholder">Photo pending</span><div><h3>{title}{i === 0 && <Play size={21}/>}</h3><p>{text}</p><span className="editorial-cta">{cta} →</span></div></button>)}</section></div><aside className="sidebar"><section className="live-card" id="radio"><h2><Flame fill="currentColor"/> Listen Live</h2><AudioLines className="waveform" size={120}/><div className="player-row"><button className="play-button" aria-label={playing ? 'Pause radio' : 'Play radio'} onClick={toggleRadio}>{playing ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button><div><h3>Aduke Radio</h3><p>{stream ? (playing ? 'Live' : 'Ready to play') : 'Stream unavailable'}</p><small>Your 24/7 Entertainment Vibes</small></div></div>{stream && <audio ref={audio} src={stream} preload="none" onEnded={() => setPlaying(false)} onError={() => setPlaying(false)}/>}</section><section className="trending-panel"><h2><Flame fill="currentColor"/> Trending Stories</h2>{trending.map((title, i) => <button className="trending-story" key={title} onClick={() => story(title)}><span className="rank">{i + 1}</span><Placeholder label={title} className={`thumbnail tone-${i + 1}`} cover={posts.find(p => p.title === title)?.cover} coverAlt={posts.find(p => p.title === title)?.coverAlt}/><div><h3>{title}</h3><time>{[2, 5, 8, 12][i]} hours ago</time></div></button>)}</section></aside></div><p className="demo-note"><Link href="/admin">Owner dashboard</Link> ? Homepage preview · Demonstration headlines · Original photography pending</p></main>
    <dialog ref={modal} onCancel={() => setDialog(null)} onClick={e => { if (e.target === e.currentTarget) setDialog(null); }}><button className="dialog-close" aria-label="Close preview" onClick={() => setDialog(null)}><X/></button><span className="dialog-label">ADUKE RADIO BLOG · PREVIEW</span><h2>{dialog?.title}</h2><p>{dialog?.text}</p><button className="primary-button" onClick={() => setDialog(null)}>Back to homepage <ArrowRight size={18}/></button></dialog>
  </div>;
}
