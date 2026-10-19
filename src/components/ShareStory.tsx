'use client';
import { useState } from 'react';
export default function ShareStory({ title }: { title: string }) {
  const [message, setMessage] = useState('');
  return <div className="share-story"><strong>Share this story</strong><button onClick={async () => { try { if (navigator.share) await navigator.share({ title, url: location.href }); else { await navigator.clipboard.writeText(location.href); setMessage('Story link copied.'); } } catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) setMessage('Copy the link from your browser address bar.'); } }}>Share / copy link ↗</button><span role="status">{message}</span></div>;
}
