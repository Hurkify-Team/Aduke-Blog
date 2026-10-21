'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, AudioLines, BarChart3, ChevronDown, ChevronLeft, ChevronRight, Clapperboard, Flame, Gamepad2, Headphones, Heart, Instagram, Menu, Mic, Moon, Music, Pause, Play, Radio, Search, Star, Sun, X, Youtube } from 'lucide-react';
import { articles as demoArticles, editorials, featured as demoFeatured, trending as demoTrending } from '@/data/homepage';

import { Post, postDate, slugify, postCategories } from '@/types/post';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';


const icons = [Music, Star, Clapperboard, Heart, Gamepad2, Mic, Play, BarChart3];
const demoTicker = ['Wizkid hints at new album', 'Nollywood stars shine at AMVCA 2024', 'Davido’s latest single breaks records', 'Top 10 viral moments this week'];

function Placeholder({ label, className = '', cover, coverAlt }: { label: string; className?: string; cover?: string; coverAlt?: string }) {
  if (cover) return <div className={`photo-placeholder ${className}`}><Image src={cover} alt={coverAlt || label} fill sizes="(max-width:700px) 100vw, 33vw" style={{ objectFit: 'cover', objectPosition: 'center 20%' }}/></div>;
  return <div className={`photo-placeholder ${className}`} role="img" aria-label={`${label} — original photo not supplied`}><span>Photo pending</span></div>;
}
function Badge({ children }: { children: React.ReactNode }) { return <span className="badge">{children}</span>; }

export default function Homepage({ posts = [], showDemo = true, availableCategories = [...postCategories] }: { posts?: Post[]; showDemo?: boolean; availableCategories?: string[] }) {
  const categories = [...availableCategories, 'Trending'];
  const includeDemo = showDemo && posts.length === 0;
  const [visibleCount, setVisibleCount] = useState(9);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const articles = [...posts.map(p => ({ ...p, time: postDate(p) })), ...(includeDemo ? demoArticles.map(p => ({ ...p, id: `demo-${p.id}`, slug: slugify(p.title), cover: '', coverAlt: '', demo: true, trending: false })) : [])];
  const featured = [...posts.filter(p => p.trending && !p.featured).map(p => ({ ...p, time: postDate(p) })), ...(includeDemo ? demoFeatured.map(p => ({ ...p, id: `demo-${p.id}`, slug: slugify(p.title), cover: '', coverAlt: '' })) : [])].slice(0, 3);
  const trendingPosts = posts.filter(p => p.trending);
  const trending = [...trendingPosts.map(p => ({ ...p, time: postDate(p) })), ...(includeDemo ? demoTrending.map((title, i) => ({ id: `demo-trending-${i}`, title, slug: slugify(title), cover: '', coverAlt: '', time: 'Sample story' })) : [])].slice(0, 4);
  const ticker = [...trendingPosts, ...posts.filter(p => !p.trending), ...(includeDemo ? demoTicker.map((title, i) => ({ id: `demo-ticker-${i}`, title, slug: slugify([demoArticles[0].title, demoTrending[0], demoArticles[2].title, demoTrending[1]][i]) })) : [])].slice(0, 4);
  const hero = posts.find(p => p.featured);

  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);
  const [search, setSearch] = useState(false);
  const allStories = params.get('view') === 'all';
  const query = params.get('search') || '';
  const chosen = params.get('category') || 'Home';
  const category = categories.includes(chosen) ? chosen : 'Home';
  const [tick, setTick] = useState(0);
  const [rowsPaused, setRowsPaused] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; text: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const stream = process.env.NEXT_PUBLIC_RADIO_STREAM_URL;
  useEffect(() => {
    try { setDark(localStorage.getItem('aduke-theme') === 'dark'); } catch {}
  }, []);
  useEffect(() => { if (dialog) modal.current?.showModal(); else modal.current?.close(); }, [dialog]);
  function filter(value: string, text = query, replace = false, all = false) {
    const next = new URLSearchParams(params.toString());
    if (all) next.set('view', 'all'); else next.delete('view');
    if (value === 'Home') next.delete('category'); else next.set('category', value);
    if (text) next.set('search', text); else next.delete('search');
    const url = `${pathname}${next.size ? `?${next}` : ''}`;
    if (replace) router.replace(url, { scroll: false }); else router.push(url, { scroll: false });
  }
  function select(value: string) { filter(value); setMenu(false); setMore(false); document.getElementById('latest')?.scrollIntoView({ behavior: 'smooth' }); }
  useEffect(() => { setVisibleCount(9); }, [category, query]);
  const filtered = articles.filter(a => (category === 'Home' || (category === 'Trending' && a.trending) || a.category === category) && `${a.title} ${a.category}`.toLowerCase().includes(query.toLowerCase()));
  async function toggleRadio() {
    if (!stream) { setDialog({ title: 'Live radio is not connected', text: 'Our live stream is not available yet. Please check back soon.' }); return; }
    if (playing) { audio.current?.pause(); setPlaying(false); }
    else { try { await audio.current?.play(); setPlaying(true); } catch { setDialog({ title: 'Stream unavailable', text: 'The radio stream could not be played. Please try again later.' }); } }
  }
  return <div className={dark ? 'site dark' : 'site'}>
    <a className="skip-link" href="#latest">Skip to latest stories</a>
    <div className="utility"><div className="utility-inner"><span className="tagline"><Headphones size={13} /> Stay Tuned. Stay Entertained.</span><div className="utility-links">{['About', 'Advertise', 'Contact'].map(x => <button key={x} onClick={() => setDialog({ title: x, text: `${x} details are being prepared by the Aduke Radio Blog team. Please check back soon.` })}>{x}</button>)}<span className="separator"/><div className="socials"><span aria-label="Facebook">f</span><span aria-label="X">𝕏</span><Instagram size={15}/><Youtube size={16}/><span aria-label="TikTok">♪</span></div><span className="separator"/><button className="theme-toggle" aria-label="Toggle color theme" onClick={() => { setDark(!dark); document.documentElement.classList.toggle('dark', !dark); try { localStorage.setItem('aduke-theme', dark ? 'light' : 'dark'); } catch {} }}><Moon size={15}/><Sun size={13}/></button></div></div></div>
    <header className="header"><div className="header-inner"><a href="#" className="logo" aria-label="Aduke Radio Blog home" onClick={() => filter('Home', '')}><Image src="/images/logo.png" alt="Aduke Radio Blog" width={2172} height={724} priority /></a><nav aria-label="Main navigation" className={menu ? 'main-nav open' : 'main-nav'}>{['Home', ...categories.slice(0, 7)].map(x => <button className={category === x ? 'active' : ''} key={x} onClick={() => select(x)}>{x}</button>)}<div className="more-wrap"><button aria-expanded={more} onClick={() => setMore(!more)}>More <ChevronDown size={12}/></button>{more && <div className="more-menu">{categories.slice(7).map(name => <button key={name} onClick={() => select(name)}>{name}</button>)}<button onClick={() => setDialog({ title: 'About Aduke', text: 'Aduke Radio Blog brings music, entertainment, and culture together. Music, culture and entertainment from Aduke Radio Blog.' })}>About Aduke</button></div>}</div></nav><div className="header-actions"><button className="search-button" aria-label="Search stories" aria-expanded={search} onClick={() => setSearch(!search)}><Search size={23}/></button><button className="radio-button" onClick={() => document.getElementById('radio')?.scrollIntoView({ behavior: 'smooth' })}><Radio size={18}/> Live Radio</button><button className="mobile-toggle" aria-label="Toggle navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div></div>{search && <form className="search-panel" onSubmit={e => { e.preventDefault(); document.getElementById('latest')?.scrollIntoView({ behavior: 'smooth' }); }}><label htmlFor="search">Search stories</label><input autoFocus id="search" value={query} onChange={e => { filter('Home', e.target.value, true); }} placeholder="Search music, stars, stories…"/><button type="submit"><Search size={18}/> Search</button><button type="button" aria-label="Close search" onClick={() => { setSearch(false); filter(category, ''); }}><X size={18}/></button></form>}</header>
    <section className="ticker" aria-label="Trending headlines"><div className="ticker-label"><Flame size={17} fill="currentColor"/> TRENDING NOW</div><div className={`ticker-headlines sliding-viewport${rowsPaused ? ' sliding-paused' : ''}`}><div className="sliding-track ticker-track">{[0, 1].map(copy => <div className="sliding-group ticker-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>{ticker.map((_, i) => { const item = ticker[(i + tick) % ticker.length]; return <Link key={item.id} tabIndex={copy === 1 ? -1 : undefined} href={`/stories/${item.slug}`}>{item.title}</Link>; })}{!ticker.length && <span className="ticker-empty">Latest entertainment news from Aduke Radio</span>}</div>)}</div></div><div className="ticker-controls"><button aria-label={rowsPaused ? 'Resume sliding rows' : 'Pause sliding rows'} aria-pressed={rowsPaused} onClick={() => setRowsPaused(!rowsPaused)}>{rowsPaused ? <Play size={14}/> : <Pause size={14}/>}</button><button aria-label="Previous headlines" onClick={() => setTick((tick + ticker.length - 1) % Math.max(1, ticker.length))}><ChevronLeft size={18}/></button><button aria-label="Next headlines" onClick={() => setTick((tick + 1) % Math.max(1, ticker.length))}><ChevronRight size={18}/></button></div></section>
    <section className="hero"><div className="hero-art" role="img" aria-label={hero?.coverAlt || "Featured artist photograph placeholder"}>{hero?.cover ? <Image src={hero.cover} alt={hero.coverAlt} fill priority sizes="100vw" style={{ objectFit: "cover", objectPosition: "center" }}/> : <span>Featured artist photo pending</span>}</div><div className="hero-inner"><div className={hero ? "hero-copy has-story" : "hero-copy"}><Badge>{hero?.category === 'Music' ? 'Artist Spotlight' : 'Featured Story'}</Badge><h1 className={hero ? "published-hero-title" : undefined}>{hero ? hero.title : <>The Sound,<br/>The Stars,<br/><em>The Stories.</em></>}</h1><p>{hero ? hero.excerpt : <>Your front-row seat to everything<br className="desktop-break"/> entertainment. Music. Celebrities.<br className="desktop-break"/> Nollywood. Lifestyle. Culture. And more.</>}</p><Link className="primary-button" href={hero ? `/stories/${hero.slug}` : includeDemo ? `/stories/${slugify("The Sound, The Stars, The Stories. Blog feature")}` : "#latest"}>{hero || includeDemo ? "Read Full Story" : "Explore Stories"} <ArrowRight size={18}/></Link></div><div className="featured-list">{featured.map(a => <Link className="featured-story" key={a.id} href={`/stories/${a.slug}`}><Placeholder label={a.title} className={`featured-photo tone-${a.id}`} cover={a.cover} coverAlt={a.coverAlt}/><div><Badge>{a.category}</Badge><h2>{a.title}</h2><time>{a.time}</time></div></Link>)}</div></div></section>
    <main className="page-content"><div className="category-sliding-row"><nav className={`category-nav sliding-viewport${rowsPaused ? ' sliding-paused' : ''}`} aria-label="News categories"><div className="sliding-track category-track">{[0, 1].map(copy => <div className="sliding-group category-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>{categories.map((x, i) => { const Icon = x === 'Trending' ? BarChart3 : icons[i] || Gamepad2; return <button aria-pressed={category === x} className={category === x ? 'selected' : ''} tabIndex={copy === 1 ? -1 : undefined} key={x} onClick={() => select(x)}><Icon size={27} fill={i === 1 || i === 3 ? 'currentColor' : 'none'}/>{x}</button>; })}</div>)}</div></nav><button className="category-motion-toggle" aria-label={rowsPaused ? 'Resume sliding rows' : 'Pause sliding rows'} aria-pressed={rowsPaused} onClick={() => setRowsPaused(!rowsPaused)}>{rowsPaused ? <Play size={15}/> : <Pause size={15}/>}</button></div><div className="content-grid"><div><section id="latest" className="latest"><div className="section-heading"><h2>{category === 'Home' || category === 'Trending' ? 'Latest Stories' : category}<span className="coral-dot"/></h2><button onClick={() => { filter('Home', '', false, true); }}>View All <ArrowRight size={15}/></button></div><div className="article-grid">{filtered.slice(0, allStories ? filtered.length : visibleCount).map(a => <article className="article-card" key={a.id}><Link className="article-link" href={`/stories/${a.slug}`}><Placeholder label={a.title} className={`article-photo tone-${a.id}`} cover={a.cover} coverAlt={a.coverAlt}/><div className="article-content"><div className="article-meta"><Badge>{a.category}</Badge><time>{a.time}</time></div>{a.demo && <span className="card-demo-label">Design demonstration</span>}<h3>{a.title}</h3><p>{a.excerpt}</p></div></Link></article>)}</div>{!allStories && filtered.length > visibleCount && <button className="load-more-stories" onClick={() => setVisibleCount(count => count + 9)}>More stories <ArrowRight size={16}/><span>{Math.min(visibleCount, filtered.length)} of {filtered.length}</span></button>}{filtered.length === 0 && <div className="empty-state">No stories in this selection yet. <button onClick={() => { filter('Home', ''); }}>Show all stories →</button></div>}</section><section className="editorials" aria-label="Explore Aduke">{editorials.map(([title, text, cta, cat], i) => <button className={`editorial tone-${i + 1}`} key={title} onClick={() => select(cat)}><span className="tile-placeholder" aria-hidden="true">{i === 0 ? <Mic size={60}/> : i === 1 ? <Music size={60}/> : i === 2 ? <Heart size={60}/> : <Play size={60}/>}</span><div><h3>{title}{i === 0 && <Play size={21}/>}</h3><p>{text}</p><span className="editorial-cta">{cta} →</span></div></button>)}</section></div><aside className="sidebar"><section className="live-card" id="radio"><h2><Flame fill="currentColor"/> Listen Live</h2><AudioLines className="waveform" size={120}/><div className="player-row"><button className="play-button" aria-label={playing ? 'Pause radio' : 'Play radio'} onClick={toggleRadio}>{playing ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button><div><h3>Aduke Radio</h3><p>{stream ? (playing ? 'Live' : 'Ready to play') : 'Stream unavailable'}</p><small>Your 24/7 Entertainment Vibes</small></div></div>{stream && <audio ref={audio} src={stream} preload="none" onEnded={() => setPlaying(false)} onError={() => setPlaying(false)}/>}</section><section className="trending-panel"><h2><Flame fill="currentColor"/> Trending Stories</h2>{trending.map((post, i) => <Link className="trending-story" key={post.id} href={`/stories/${post.slug}`}><span className="rank">{i + 1}</span><Placeholder label={post.title} className={`thumbnail tone-${i + 1}`} cover={post.cover} coverAlt={post.coverAlt}/><div><h3>{post.title}</h3><time>{post.time}</time></div></Link>)}{!trending.length && <p className="trending-empty">Trending stories will appear here.</p>}</section></aside></div><p className="demo-note">Music, culture and the stories that matter. <Link href="/credits">Image credits</Link></p></main>
    <dialog ref={modal} onCancel={() => setDialog(null)} onClick={e => { if (e.target === e.currentTarget) setDialog(null); }}><button className="dialog-close" aria-label="Close preview" onClick={() => setDialog(null)}><X/></button><span className="dialog-label">ADUKE RADIO BLOG · PREVIEW</span><h2>{dialog?.title}</h2><p>{dialog?.text}</p><button className="primary-button" onClick={() => setDialog(null)}>Back to homepage <ArrowRight size={18}/></button></dialog>
  </div>;
}
