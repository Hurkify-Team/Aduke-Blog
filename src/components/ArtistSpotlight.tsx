'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { Post } from '@/types/post';

export default function ArtistSpotlight({posts}:{posts:Post[]}) {
  const candidates=posts.filter(post=>post.status==='published'&&post.cover&&(post.featured||post.spotlight));
  const selected=new Set(candidates.map(post=>post.id));
  const recentMusic=posts.filter(post=>post.status==='published'&&post.cover&&post.category==='Music'&&!selected.has(post.id));
  const slides=[...candidates.filter(post=>post.featured),...candidates.filter(post=>!post.featured),...recentMusic].slice(0,5);
  const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[hover,setHover]=useState(false),[focused,setFocused]=useState(false),[reduced,setReduced]=useState(true),[visible,setVisible]=useState(true);
  const count=slides.length,active=Math.min(index,Math.max(0,count-1));
  useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);const visibility=()=>setVisible(!document.hidden);update();visibility();media.addEventListener('change',update);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',update);document.removeEventListener('visibilitychange',visibility);};},[]);
  useEffect(()=>{if(count<2||paused||hover||focused||reduced||!visible)return;const timer=window.setInterval(()=>setIndex(current=>(current+1)%count),7000);return()=>window.clearInterval(timer);},[count,paused,hover,focused,reduced,visible]);
  function move(offset:number){setIndex((active+offset+count)%count);}
  return <section className="spotlight-section" aria-label="Artist spotlight and featured stories" aria-roledescription="carousel" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}>
    <div className="spotlight-shell"><div className="spotlight-heading"><span>IN THE SPOTLIGHT</span><span>{count?`${active+1} / ${count}`:'Aduke Radio TV'}</span></div>
      {count?<div className="spotlight-stage" aria-live={paused||reduced?'polite':'off'}>{slides.map((post,i)=><article className="spotlight-slide" key={post.id} hidden={i!==active} role="group" aria-roledescription="slide" aria-label={`${i+1} of ${count}`}><div className="spotlight-copy"><span className="badge">{post.category==='Music'?'Artist Spotlight':'Featured Story'}</span><span className="spotlight-category">{post.category}</span><h1>{post.title}</h1><p>{post.excerpt}</p><Link className="primary-button" href={`/stories/${post.slug}`}>Read full story <ArrowRight size={17}/></Link></div><Link className="spotlight-image" href={`/stories/${post.slug}`} aria-label={`Read ${post.title}`}><Image src={post.cover} alt={post.coverAlt||post.title} fill priority={i===0} sizes="(max-width: 700px) 100vw, 48vw" style={{objectFit:'contain'}}/></Link></article>)}</div>:<div className="spotlight-welcome"><span className="badge">Aduke Radio TV</span><h1>The sound. The stars. The stories.</h1><p>Your front-row seat to music, entertainment and culture.</p><a className="primary-button" href="#latest">Explore stories <ArrowRight size={17}/></a></div>}
      {count>1&&<div className="spotlight-controls"><div className="spotlight-dots" aria-label="Choose a spotlight slide">{slides.map((post,i)=><button type="button" key={post.id} aria-label={`Show slide ${i+1}: ${post.title}`} aria-current={i===active?'true':undefined} onClick={()=>setIndex(i)}><span/></button>)}</div><div className="spotlight-arrows"><button type="button" aria-label="Previous spotlight" onClick={()=>move(-1)}><ChevronLeft size={19}/></button><button type="button" aria-label={paused?'Resume automatic slides':'Pause automatic slides'} aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?<Play size={16}/>:<Pause size={16}/>}</button><button type="button" aria-label="Next spotlight" onClick={()=>move(1)}><ChevronRight size={19}/></button></div></div>}
    </div>
  </section>;
}
