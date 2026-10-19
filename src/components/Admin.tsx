'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Eye, FileText, ImagePlus, LogOut, Plus, Save, Send } from 'lucide-react';
import { Post, postCategories, slugify, postDate } from '@/types/post';

type Editor = Partial<Post> & Pick<Post, 'title' | 'category' | 'body' | 'excerpt' | 'author' | 'cover' | 'coverAlt' | 'video' | 'featured' | 'trending'>;
const empty = (): Editor => ({ title: '', slug: '', category: 'Music', body: '', excerpt: '', author: 'Aduke Editorial Team', cover: '', coverAlt: '', video: '', featured: false, trending: false });
export default function Admin({ configured, signedIn, initialPosts }: { configured: boolean; signedIn: boolean; initialPosts: Post[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts), [editor, setEditor] = useState<Editor>(empty);
  const [password, setPassword] = useState(''), [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [dirty, setDirty] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [filter, setFilter] = useState('all'), [search, setSearch] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('post');
    const selected = initialPosts.find(p => p.id === id); if (selected) setEditor(selected);
  }, []);
  useEffect(() => { setPosts(initialPosts); }, [initialPosts]);
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) { if (dirty) { e.preventDefault(); e.returnValue = ''; } }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function authenticate(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!configured && password !== confirmPassword) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try { const response = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: configured ? 'login' : 'setup', password }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setPassword(''); setConfirmPassword(''); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign in.'); } finally { setBusy(false); }
  }
  function update<K extends keyof Editor>(key: K, value: Editor[K]) { setEditor(p => ({ ...p, [key]: value })); setDirty(true); setNotice(''); }
  function open(post?: Post) {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    setEditor(post ? { ...post } : empty()); setDirty(false); setError(''); setNotice('');
  }
  async function save(status: 'draft' | 'published', preview = false) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...editor, status, slug: editor.slug || slugify(editor.title) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      const post = data as Post; setEditor(post); setDirty(false);
      const list = await fetch('/api/admin/posts', { cache: 'no-store' }); if (list.ok) setPosts(await list.json());
      setNotice(status === 'published' ? 'Published. Your story is now on the homepage.' : 'Draft saved. Only you can preview it.');
      if (preview) router.push(`/admin/preview/${post.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your post.'); } finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file) return; setError(''); setUploading(true);
    try { const form = new FormData(); form.set('image', file);
      const response = await fetch('/api/admin/upload', { method: 'POST', body: form }); const data = await response.json();
      if (!response.ok) throw new Error(data.error); update('cover', data.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); } finally { setUploading(false); }
  }
  function heading() {
    const field = bodyRef.current; if (!field) return;
    const start = field.selectionStart, end = field.selectionEnd;
    update('body', `${editor.body.slice(0, start)}${start && editor.body[start - 1] !== '\n' ? '\n\n' : ''}## ${editor.body.slice(start, end) || 'Section heading'}\n\n${editor.body.slice(end)}`);
    field.focus();
  }
  async function logout() {
    if (dirty && !window.confirm('Sign out and discard your unsaved changes?')) return;
    setBusy(true); setError('');
    try { const result = await fetch('/api/admin/auth', { method: 'DELETE' }); if (!result.ok) throw new Error('Could not sign out.'); setEditor(empty()); setDirty(false); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not sign out.'); } finally { setBusy(false); }
  }
  if (!signedIn) return <main className="owner-login"><Link href="/" className="owner-back"><ArrowLeft size={16}/> Back to Aduke Radio Blog</Link><section className="login-card"><Image src="/images/logo.png" alt="Aduke Radio Blog" width={300} height={100} priority/><span className="owner-eyebrow">OWNER ACCESS</span><h1>{configured ? 'Welcome back.' : 'Your newsroom starts here.'}</h1><p>{configured ? 'Sign in to write, edit and publish your stories.' : 'Create your owner password. This one-time setup is available from localhost.'}</p><form onSubmit={authenticate}><label htmlFor="owner-password">{configured ? 'Password' : 'Create a password'}</label><input id="owner-password" type="password" autoComplete={configured ? 'current-password' : 'new-password'} required minLength={configured ? 1 : 12} maxLength={200} value={password} onChange={e => setPassword(e.target.value)}/>{!configured && <><small>At least 12 characters. Keep it somewhere safe.</small><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}/></>}{error && <p className="owner-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : configured ? 'Sign in' : 'Create owner account'}</button></form></section></main>;
  const visible = posts.filter(p => (filter === 'all' || p.status === filter) && p.title.toLowerCase().includes(search.toLowerCase()));
  const disabled = busy || uploading;
  return <div className="owner-app"><header className="owner-header"><Link href="/"><Image src="/images/logo.png" alt="Aduke Radio Blog" width={165} height={55}/></Link><span>Owner dashboard</span><div><Link href="/" target="_blank">View blog ↗</Link><button onClick={logout} disabled={disabled}><LogOut size={16}/> Sign out</button></div></header><main className="owner-main"><div className="owner-title"><div><span className="owner-eyebrow">YOUR NEWSROOM</span><h1>Stories worth sharing.</h1><p>Create, polish and publish to Aduke Radio Blog.</p></div><button className="primary-button" disabled={disabled} onClick={() => open()}><Plus size={17}/> New post</button></div><div className="owner-stats"><div><FileText/><strong>{posts.length}</strong><span>Total posts</span></div><div><Send/><strong>{posts.filter(p => p.status === 'published').length}</strong><span>Published</span></div><div><Save/><strong>{posts.filter(p => p.status === 'draft').length}</strong><span>Drafts</span></div></div><div className="owner-workspace"><aside className="post-library"><h2>Your posts</h2><label className="sr-only" htmlFor="post-search">Search your posts</label><input id="post-search" placeholder="Find a story…" value={search} onChange={e => setSearch(e.target.value)}/><div className="post-tabs">{['all', 'published', 'draft'].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'draft' ? 'Drafts' : value}</button>)}</div><div className="post-list">{visible.map(post => <button key={post.id} className={editor.id === post.id ? 'post-list-item current' : 'post-list-item'} disabled={disabled} onClick={() => open(post)}><span className={`status-pill ${post.status}`}>{post.status}</span><h3>{post.title}</h3><p>{post.category} · {postDate(post)}</p></button>)}{!visible.length && <div className="library-empty"><FileText size={28}/><p>{posts.length ? 'No matching posts.' : 'Your first story starts here. Create a new post to get going.'}</p></div>}</div><p className="storage-note">Saved on this computer. Back up the data and uploads folders together.</p></aside><section className="post-editor"><div className="editor-heading"><h2>{editor.id ? 'Edit story' : 'New story'}</h2><span>{dirty ? 'Unsaved changes' : editor.id ? 'All changes saved' : 'Not saved yet'}</span></div><form onSubmit={e => { e.preventDefault(); save(editor.status === 'published' ? 'published' : 'draft'); }}><fieldset disabled={disabled}><label htmlFor="title">Post title</label><input className="title-input" id="title" required minLength={3} maxLength={180} placeholder="Give your story a great headline" value={editor.title} onChange={e => update('title', e.target.value)}/><div className="field-row"><div><label htmlFor="category">Category</label><select id="category" value={editor.category} onChange={e => update('category', e.target.value)}>{postCategories.map(x => <option key={x}>{x}</option>)}</select></div><div><label htmlFor="author">Author</label><input id="author" maxLength={100} value={editor.author} onChange={e => update('author', e.target.value)}/></div></div><label htmlFor="slug">Story URL</label><div className="slug-field"><span>/stories/</span><input id="slug" maxLength={100} value={editor.slug || ''} placeholder={slugify(editor.title) || 'your-story-title'} onChange={e => update('slug', slugify(e.target.value))}/></div><small>Generated from the title unless you enter your own. Keep it stable after publishing.</small><label htmlFor="excerpt">Short excerpt <span>{editor.excerpt.length}/350</span></label><textarea id="excerpt" rows={3} maxLength={350} placeholder="The introduction readers see on the homepage…" value={editor.excerpt} onChange={e => update('excerpt', e.target.value)}/><label htmlFor="cover">Cover photograph</label><div className="cover-upload">{editor.cover ? <><Image src={editor.cover} alt={editor.coverAlt || 'Cover preview'} width={800} height={450} unoptimized/><button type="button" onClick={() => { update('cover', ''); update('coverAlt', ''); }}>Remove cover</button></> : <><ImagePlus size={30}/><span>Upload your story’s cover photograph</span></>}<input id="cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }}/><small>JPG, PNG or WebP · Up to 5 MB</small></div>{editor.cover && <><label htmlFor="cover-alt">Image description</label><input id="cover-alt" required maxLength={200} placeholder="Describe what the image shows" value={editor.coverAlt} onChange={e => update('coverAlt', e.target.value)}/></>}<div className="body-label"><label htmlFor="body">Full article</label><button type="button" onClick={heading}>+ Section heading</button></div><textarea ref={bodyRef} id="body" className="body-editor" rows={15} maxLength={100000} placeholder="Write your story here… Separate paragraphs with a blank line. Start a section heading with ##." value={editor.body} onChange={e => update('body', e.target.value)}/><small>Use a blank line between paragraphs, ## for headings, and - for list items. Text is rendered safely; HTML is not accepted.</small><label htmlFor="video">YouTube video URL <span>Optional</span></label><input id="video" type="url" placeholder="https://www.youtube.com/watch?v=…" value={editor.video} onChange={e => update('video', e.target.value)}/><div className="placement-options"><label><input type="checkbox" checked={editor.featured} onChange={e => update('featured', e.target.checked)}/><span><strong>Feature on the homepage</strong><small>Use this story for the hero. Publishing replaces the previous featured story.</small></span></label><label><input type="checkbox" checked={editor.trending} onChange={e => update('trending', e.target.checked)}/><span><strong>Add to Trending Stories</strong><small>Show in the sidebar and headline ticker when published.</small></span></label></div></fieldset>{error && <p className="owner-error" role="alert">{error}</p>}{notice && <p className="owner-success" role="status"><Check size={17}/>{notice}</p>}<div className="editor-actions"><button className="secondary-button" type="button" disabled={disabled} onClick={() => save(editor.status === 'published' ? 'published' : 'draft', true)}><Eye size={17}/> Save & preview</button><button className="secondary-button" type="submit" disabled={disabled}><Save size={17}/>{editor.status === 'published' ? 'Save changes' : 'Save draft'}</button><button className="primary-button" type="button" disabled={disabled} onClick={() => { if (editor.status === 'published') { if (window.confirm('Unpublish this story? It will become a private draft.')) void save('draft'); } else void save('published'); }}><Send size={17}/>{busy ? 'Saving…' : uploading ? 'Uploading…' : editor.status === 'published' ? 'Unpublish' : 'Publish post'}</button></div>{editor.id && <div className="saved-links"><Link href={`/admin/preview/${editor.id}`}>Preview saved version</Link>{editor.status === 'published' && <Link href={`/stories/${editor.slug}`} target="_blank">View published story ↗</Link>}</div>}</form></section></div></main></div>;
}
