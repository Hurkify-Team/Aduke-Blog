'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Star } from 'lucide-react';
import { postDate, type Post } from '@/types/post';

export default function ArtistSpotlight({posts}:{posts:Post[]}) {
  const candidates=posts.filter(post=>post.status==='published'&&post.cover&&(post.featured||post.spotlight));
  const selected=new Set(candidates.map(post=>post.id));
  const recentMusic=posts.filter(post=>post.status==='published'&&post.cover&&post.category==='Music'&&!selected.has(post.id));
  const slides=[...candidates.filter(post=>post.featured),...candidates.filter(post=>!post.featured),...recentMusic].slice(0,5);
  const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[hover,setHover]=useState(false),[focused,setFocused]=useState(false),[reduced,setReduced]=useState(true),[visible,setVisible]=useState(true);
  const count=slides.length,active=Math.min(index,Math.max(0,count-1));
  const touchStart=useRef<{x:number;y:number}|null>(null);
  const automatic=count>1&&!paused&&!hover&&!focused&&!reduced&&visible;
  useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);const visibility=()=>setVisible(!document.hidden);update();visibility();media.addEventListener('change',update);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',update);document.removeEventListener('visibilitychange',visibility);};},[]);
  useEffect(()=>{if(count<2||paused||hover||focused||reduced||!visible)return;const timer=window.setInterval(()=>setIndex(current=>(current+1)%count),10000);return()=>window.clearInterval(timer);},[count,paused,hover,focused,reduced,visible]);
  function move(offset:number){setIndex((active+offset+count)%count);}
  return <section className="spotlight-section" aria-label="Artist spotlight and featured stories" aria-roledescription="carousel" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}>
    <div className="spotlight-shell">
      <div className="spotlight-heading"><div className="spotlight-masthead"><span className="spotlight-emblem" aria-hidden="true"><Star size={17}/></span><span>THE ADUKE <strong>SPOTLIGHT</strong></span></div><span className="spotlight-heading-note">Music. People. Culture.</span></div>
      {count?<>
        <div className="spotlight-stage" aria-live={automatic?'off':'polite'} onTouchStart={event=>{const touch=event.touches[0];touchStart.current={x:touch.clientX,y:touch.clientY};}} onTouchEnd={event=>{const start=touchStart.current;touchStart.current=null;const end=event.changedTouches[0];if(start&&count>1&&Math.abs(end.clientX-start.x)>65&&Math.abs(end.clientX-start.x)>Math.abs(end.clientY-start.y)*1.5)move(end.clientX<start.x?1:-1);}} onTouchCancel={()=>{touchStart.current=null;}}>
          {slides.map((post,i)=><article className="spotlight-slide" key={post.id} hidden={i!==active} role="group" aria-roledescription="slide" aria-label={`${i+1} of ${count}`}>
            <div className="spotlight-copy"><div className="spotlight-kicker"><span className="badge">{post.category==='Music'?'Artist Spotlight':'Featured Story'}</span><span className="spotlight-category">{post.category}</span></div><h1 className={post.title.length>110?'spotlight-title-long':undefined}>{post.title}</h1><p>{post.excerpt}</p><div className="spotlight-byline"><span>{post.author||'Aduke Editorial Team'}</span><span aria-hidden="true"/><time dateTime={post.publishedAt||post.updatedAt}>{postDate(post)}</time></div><div className="spotlight-story-actions"><Link className="primary-button" href={`/stories/${post.slug}`}>Read the story <ArrowRight size={18}/></Link><a className="spotlight-explore" href="#latest">Explore more <ArrowRight size={15}/></a></div></div>
            <Link className="spotlight-image" href={`/stories/${post.slug}`} aria-label={`Read ${post.title}`}><Image className="spotlight-ambient" src={post.cover} alt="" aria-hidden="true" fill priority={i===0} sizes="(max-width:700px) 100vw, 50vw" draggable={false}/><Image className="spotlight-portrait" src={post.cover} alt={post.coverAlt||post.title} fill priority={i===0} sizes="(max-width:700px) 100vw, 50vw" draggable={false}/><span className="spotlight-image-corner" aria-hidden="true">{String(i+1).padStart(2,'0')}<span> / {String(count).padStart(2,'0')}</span></span></Link>
          </article>)}
        </div>
        {count>1&&<div className="spotlight-navigation"><div className="spotlight-navigation-heading"><span><span className="spotlight-active-marker" aria-hidden="true"/> Discover in the spotlight</span><div className="spotlight-arrows"><span className="spotlight-position" aria-hidden="true">{String(active+1).padStart(2,'0')} / {String(count).padStart(2,'0')}</span><button type="button" aria-label="Previous spotlight" onClick={()=>move(-1)}><ChevronLeft size={18}/></button><button type="button" aria-label={paused?'Resume automatic slides':'Pause automatic slides'} aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?<Play size={14}/>:<Pause size={14}/>}</button><button type="button" aria-label="Next spotlight" onClick={()=>move(1)}><ChevronRight size={18}/></button></div></div><div className="spotlight-preview-list" aria-label="Choose a spotlight story">{slides.map((post,i)=><button className="spotlight-preview" type="button" key={post.id} aria-label={`Show slide ${i+1}: ${post.title}`} aria-current={i===active?'true':undefined} onClick={()=>setIndex(i)}><span className="spotlight-preview-photo"><Image src={post.cover} alt="" fill sizes="64px"/></span><span className="spotlight-preview-copy"><span className="spotlight-preview-category">{String(i+1).padStart(2,'0')} <span aria-hidden="true">/</span> {post.category}</span><strong>{post.title}</strong></span></button>)}</div></div>}
      </>:<div className="spotlight-welcome"><span className="badge">Aduke Radio TV</span><h1>The sound. The stars. The stories.</h1><p>Your front-row seat to music, entertainment and culture.</p><a className="primary-button" href="#latest">Explore stories <ArrowRight size={17}/></a></div>}
    </div>
  </section>;
}
