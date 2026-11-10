'use client';
import NewsRadar from './NewsRadar';
import TeamAccess from './TeamAccess';
import type { StaffIdentity } from '@/types/team';
import NewsImporter from './NewsImporter';
import RichTextEditor from './RichTextEditor';
import { bodyText, wordCount } from '@/lib/rich-text';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Settings2, Search, CircleCheck, Archive, RotateCcw, Copy, ArrowLeft, Check, Eye, FileText, ImagePlus, LogOut, Plus, Save, Send } from 'lucide-react';
import { Post, postCategories, slugify, postDate } from '@/types/post';

type Editor = Partial<Post> & Pick<Post, 'title' | 'category' | 'body' | 'excerpt' | 'author' | 'cover' | 'coverAlt' | 'video' | 'featured' | 'trending'>;
const empty = (): Editor => ({ title: '', slug: '', category: 'Music', body: '', excerpt: '', author: 'Aduke Editorial Team', cover: '', coverAlt: '', video: '', featured: false, trending: false });
export default function Admin({ configured, signedIn, initialPosts, initialCategories = [...postCategories], user = null, ownerRecoveryReady = false, ownerRecoveryEmail = '' }: { ownerRecoveryReady?:boolean; ownerRecoveryEmail?:string; configured: boolean; signedIn: boolean; initialPosts: Post[]; initialCategories?: string[]; user?: StaffIdentity | null }) {
  const router = useRouter();
  const canPublish = user?.role !== 'author';
  const recoveryKey = 'aduke-editor-recovery:' + (user?.id || 'owner');
  const [username, setUsername] = useState('');
  const [loginRole,setLoginRole]=useState<'owner'|'team'>('owner');
  const [categories, setCategories] = useState<string[]>(initialCategories), [newCategory, setNewCategory] = useState(''), [categoryBusy, setCategoryBusy] = useState(false), [categoryError, setCategoryError] = useState('');
  async function addCategory() {
    setCategoryBusy(true); setCategoryError('');
    try { const response = await fetch('/api/categories', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:newCategory})}); const data = await response.json(); if (!response.ok) throw new Error(data.error); setCategories(data.categories); update('category',data.name); setNewCategory(''); }
    catch(error) { setCategoryError(error instanceof Error ? error.message : 'Could not create category.'); } finally { setCategoryBusy(false); }
  }
  const [posts, setPosts] = useState(initialPosts), [editor, setEditor] = useState<Editor>(empty);
  const [password, setPassword] = useState(''), [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [dirty, setDirty] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [filter, setFilter] = useState('all'), [search, setSearch] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''), [newPassword, setNewPassword] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [recovery, setRecovery] = useState<Editor | null>(null);
  const editorForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('post');
    const selected = initialPosts.find(p => p.id === id); if (selected) setEditor(selected);
  }, []);
  useEffect(() => { setPosts(initialPosts); }, [initialPosts]);
  useEffect(() => {
    if (!signedIn) return;
    try {
      const saved = sessionStorage.getItem(recoveryKey);
      if (saved) {
        const value = JSON.parse(saved);
        if (value && typeof value.title === 'string' && typeof value.body === 'string' && typeof value.excerpt === 'string' && typeof value.category === 'string') setRecovery(value);
      }
    } catch {}
  }, [signedIn, recoveryKey]);
  useEffect(() => {
    if (!signedIn || !dirty) return;
    const timer = setTimeout(() => {
      try { sessionStorage.setItem(recoveryKey, JSON.stringify(editor)); } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [editor, dirty, signedIn, recoveryKey]);
  function clearRecovery() {
    try { sessionStorage.removeItem(recoveryKey); } catch {}
    setRecovery(null);
  }

  useEffect(() => {
    function warn(e: BeforeUnloadEvent) { if (dirty) { e.preventDefault(); e.returnValue = ''; } }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function authenticate(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!configured && password !== confirmPassword) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try { const response = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: configured ? 'login' : 'setup', password, username:loginRole==='owner'?'owner':username }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setPassword(''); setConfirmPassword(''); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign in.'); } finally { setBusy(false); }
  }
  function update<K extends keyof Editor>(key: K, value: Editor[K]) { setEditor(p => ({ ...p, [key]: value })); setDirty(true); setNotice(''); }
  function open(post?: Post) {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    clearRecovery(); setEditor(post ? { ...post } : {...empty(),author:user?.role==='owner'?'Aduke Editorial Team':user?.name || 'Aduke Editorial Team'}); setDirty(false); setError(''); setNotice('');
  }
  async function save(status: 'draft' | 'published', preview = false) {
    if (!editorForm.current?.reportValidity()) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...editor, status, slug: editor.slug || slugify(editor.title) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      const post = data as Post; setEditor(post); setDirty(false); clearRecovery();
      const list = await fetch('/api/admin/posts', { cache: 'no-store' }); if (list.ok) setPosts(await list.json());
      setNotice(status === 'published' ? 'Published. Your story is now on the homepage.' : 'Draft saved. Editors and the owner can review it.');
      if (preview) router.push(`/admin/preview/${post.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your post.'); } finally { setBusy(false); }
  }
  async function changeArchive(restore: boolean) {
    if (!editor.id || (dirty && !window.confirm('Discard unsaved changes and continue?'))) return;
    if (!restore && !window.confirm('Archive this story? It will be removed from the public blog. You can restore it to drafts later.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/posts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editor.id, updatedAt: editor.updatedAt, action: restore ? 'restore' : 'archive' }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setEditor(data); setPosts(items => items.map(item => item.id === data.id ? data : item));
      setDirty(false); clearRecovery(); setFilter(restore ? 'draft' : 'archived');
      setNotice(restore ? 'Restored as a private draft. Review it before publishing again.' : 'Archived. This story is hidden from readers and can be restored.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not update story.'); }
    finally { setBusy(false); }
  }
  function duplicate() {
    if (dirty && !window.confirm('Discard unsaved changes and duplicate the saved story?')) return;
    const saved = posts.find(post => post.id === editor.id); if (!saved) return;
    setEditor({ ...empty(), title: `${saved.title.slice(0, 173)} (copy)`, slug: `${saved.slug.slice(0, 80)}-copy-${Date.now().toString(36)}`, category: saved.category, excerpt: saved.excerpt, body: saved.body, bodyFormat: saved.bodyFormat, source: saved.source, coverCredit: saved.coverCredit, author: saved.author, cover: saved.cover, coverAlt: saved.coverAlt, video: saved.video });
    clearRecovery(); setDirty(true); setNotice('Copy created in the editor. Save it as a new draft.'); setError('');
  }
  function acceptImportedDraft(draft: Partial<Post>) {
    if (dirty && !window.confirm('Replace the unsaved story in your editor with this imported draft?')) return false;
    clearRecovery(); setEditor({ ...empty(), ...draft, author:user?.role==='owner'?draft.author || 'Aduke Editorial Team':user?.name || 'Aduke Editorial Team' }); setDirty(true); setError('');
    setNotice('Imported draft loaded. Review facts and source credit, then save or publish when ready.');
    return true;
  }
  async function upload(file?: File) {
    if (!file) return; setError(''); setUploading(true);
    try { const form = new FormData(); form.set('image', file);
      const response = await fetch('/api/admin/upload', { method: 'POST', body: form }); const data = await response.json();
      if (!response.ok) throw new Error(data.error); update('cover', data.url); update('coverCredit', undefined);
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); } finally { setUploading(false); }
  }
  async function updatePassword(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/auth', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCurrentPassword(''); setNewPassword(''); setNotice('Password updated. Other sessions have been signed out.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not update password.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    if (dirty && !window.confirm('Sign out and discard your unsaved changes?')) return;
    setBusy(true); setError('');
    try { const result = await fetch('/api/admin/auth', { method: 'DELETE' }); if (!result.ok) throw new Error('Could not sign out.'); clearRecovery(); setEditor(empty()); setDirty(false); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not sign out.'); } finally { setBusy(false); }
  }
  if (!signedIn) return <main className="owner-login"><Link href="/" className="owner-back"><ArrowLeft size={16}/> Back to Aduke Radio Blog</Link><section className="login-card"><Image src="/images/logo.png" alt="Aduke Radio Blog" width={300} height={100} priority/><span className="owner-eyebrow">ADUKE NEWSROOM</span><h1>{configured ? 'Welcome back.' : 'Your newsroom starts here.'}</h1><p>{configured ? 'Sign in with your own account to work on the blog.' : 'Create your owner password. This one-time setup is available from localhost.'}</p><form onSubmit={authenticate}>{configured && <><div className="login-role-tabs" aria-label="Account type"><button type="button" aria-pressed={loginRole==='owner'} onClick={()=>{setLoginRole('owner');setError('');}}>Blog owner</button><button type="button" aria-pressed={loginRole==='team'} onClick={()=>{setLoginRole('team');setError('');}}>Team member</button></div>{loginRole==='owner'?<><input type="text" name="username" value="owner" autoComplete="username" readOnly className="sr-only"/><p className="owner-login-hint">Sign in to the single owner account with your original owner password. Your username is <strong>owner</strong>.</p></>:<><label htmlFor="staff-username">Username</label><input id="staff-username" required maxLength={40} autoComplete="username" autoCapitalize="none" value={username} onChange={event=>setUsername(event.target.value)}/><small>Existing blog owner? Use <strong>owner</strong> with your current password. Coworkers use the username in their setup invitation.</small></>}</>}<label htmlFor="owner-password">{configured ? 'Password' : 'Create a password'}</label><input id="owner-password" type="password" autoComplete={configured ? 'current-password' : 'new-password'} required minLength={configured ? 1 : 12} maxLength={200} value={password} onChange={e => setPassword(e.target.value)}/>{!configured && <><small>At least 12 characters. Keep it somewhere safe.</small><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}/></>}{error && <p className="owner-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : configured ? 'Sign in' : 'Create owner account'}</button></form><p className="login-help">Team members need a private invitation from the owner. Forgotten your password? {loginRole==='owner'?<Link href="/admin/forgot-password">Request an owner recovery email</Link>:'Ask the owner for a private password reset link.'}</p></section></main>;
  const visible = posts.filter(p => (filter === 'all' ? p.status !== 'archived' : p.status === filter) && p.title.toLowerCase().includes(search.toLowerCase()));
  const disabled = busy || uploading || categoryBusy;
  const archived = editor.status === 'archived';
  const publishedReadOnly = !canPublish && editor.status === 'published';
  const checks = [
    { label: 'Headline (at least 3 characters)', ready: editor.title.trim().length >= 3 },
    { label: 'Author name', ready: !!editor.author.trim() },
    { label: 'Short excerpt', ready: !!editor.excerpt.trim() },
    { label: 'Article text (at least 50 characters)', ready: bodyText(editor.body, editor.bodyFormat).trim().length >= 50 },
    { label: 'Description for the cover image, if added', ready: !editor.cover || !!editor.coverAlt.trim() },
  ];
  const readyToPublish = checks.every(item => item.ready);
  return <div className="owner-app"><header className="owner-header"><Link href="/"><Image src="/images/logo.png" alt="Aduke Radio Blog" width={165} height={55}/></Link><span>{user?.name} ? {user?.role}</span><div><Link href="/" target="_blank">View blog ↗</Link><button onClick={logout} disabled={disabled}><LogOut size={16}/> Sign out</button></div></header><main className="owner-main"><div className="owner-title"><div><span className="owner-eyebrow">YOUR NEWSROOM</span><h1>Stories worth sharing.</h1><p>Write a draft, add your cover, preview, then publish.</p></div><button className="primary-button" disabled={disabled} onClick={() => open()}><Plus size={17}/> New post</button></div>{recovery && <div className="owner-success" role="status"><span>An unsaved story was recovered from this browser tab.</span><button type="button" onClick={() => { setEditor({ ...empty(), ...recovery }); setDirty(true); setRecovery(null); }}>Restore draft</button><button type="button" onClick={clearRecovery}>Dismiss</button></div>}<div className="newsroom-tools"><NewsImporter disabled={disabled} onDraft={acceptImportedDraft}/><details className="account-settings"><summary><Settings2 size={18}/><span>Account settings</span><ChevronDown size={16}/></summary><form onSubmit={updatePassword}><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" required maxLength={200} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}/><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" required minLength={12} maxLength={200} value={newPassword} onChange={e => setNewPassword(e.target.value)}/><button className="secondary-button" disabled={disabled}>Update password</button></form>{user?.role==='owner'&&<p className="account-recovery-status">{ownerRecoveryReady?'Owner email recovery is configured for '+ownerRecoveryEmail+'.':'Owner email recovery is not configured yet. Ask your site administrator to connect email delivery. Your private backup recovery link remains available.'}</p>}</details></div>{user?.role === 'owner' && <TeamAccess/>}{user && <NewsRadar user={user} onDraft={acceptImportedDraft}/>}<div className="owner-stats"><div><FileText/><strong>{posts.length}</strong><span>Total posts</span></div><div><Send/><strong>{posts.filter(p => p.status === 'published').length}</strong><span>Published</span></div><div><Save/><strong>{posts.filter(p => p.status === 'draft').length}</strong><span>Drafts</span></div></div><div className="owner-workspace"><aside className={`post-library${libraryOpen ? ' library-open' : ''}`} id="story-library"><div className="library-heading"><div><span className="owner-eyebrow">STORY LIBRARY</span><h2>Your posts</h2></div><span className="library-count">{visible.length}</span></div><button className="mobile-library-toggle" type="button" aria-expanded={libraryOpen} aria-controls="library-content" onClick={() => setLibraryOpen(!libraryOpen)}>Browse your stories <ChevronDown size={16}/></button><div id="library-content" className="library-content"><label className="sr-only" htmlFor="post-search">Search your posts</label><div className="library-search"><Search size={16}/><input id="post-search" placeholder="Find a story…" value={search} onChange={e => setSearch(e.target.value)}/></div><div className="post-tabs">{['all', 'published', 'draft', 'archived'].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'draft' ? 'Drafts' : value} ({posts.filter(p => value === 'all' ? p.status !== 'archived' : p.status === value).length})</button>)}</div><div className="post-list">{visible.map(post => <button key={post.id} className={editor.id === post.id ? 'post-list-item current' : 'post-list-item'} disabled={disabled} onClick={() => open(post)}><span className={`status-pill ${post.status}`}>{post.status}</span><h3>{post.title}</h3><p>{post.category} · {postDate(post)}</p></button>)}{!visible.length && <div className="library-empty"><FileText size={28}/><p>{posts.length ? 'No matching posts.' : 'Your first story starts here. Create a new post to get going.'}</p></div>}</div><p className="storage-note">Stories are saved to the configured newsroom storage. Keep regular backups of articles and uploads.</p></div></aside><section className="post-editor" id="story-editor"><div className="editor-heading"><div><span className="owner-eyebrow">EDITORIAL WORKSPACE</span><h2>{editor.id ? 'Edit story' : 'New story'}</h2></div><span className={`editor-save-state${dirty ? ' has-changes' : ''}`}>{publishedReadOnly ? 'Published - editor access required to change' : archived ? 'Archived - restore to edit' : dirty ? 'Unsaved changes' : editor.id ? 'All changes saved' : 'Not saved yet'}</span></div><nav className="editor-section-nav" aria-label="Jump to editor section"><a href="#story-details"><span>01</span> Details</a><a href="#story-cover"><span>02</span> Cover</a><a href="#story-content"><span>03</span> Article</a><a href="#story-publishing"><span>04</span> Publishing</a></nav><form ref={editorForm} onSubmit={e => { e.preventDefault(); save(editor.status === 'published' ? 'published' : 'draft'); }}><fieldset disabled={disabled || archived || publishedReadOnly}><section className="editor-section" id="story-details"><div className="section-intro"><span>01</span><div><h3>The story at a glance</h3><p>A clear headline and introduction help readers discover your story.</p></div></div>{editor.source && <div className="editor-source-credit"><strong>Source credit will appear with this article</strong><a href={editor.source.url} target="_blank" rel="noopener noreferrer">{editor.source.publisher}: {editor.source.title}</a><small>Attribution is retained when you save, duplicate or edit this story.</small></div>}<label htmlFor="title">Post title</label><input className="title-input" id="title" required minLength={3} maxLength={180} placeholder="Give your story a great headline" value={editor.title} onChange={e => update('title', e.target.value)}/><div className="field-row"><div><label htmlFor="category">Category</label><select id="category" value={editor.category} onChange={e => update('category', e.target.value)}>{categories.map(x => <option key={x}>{x}</option>)}</select>{canPublish && <details className="create-category"><summary><Plus size={13}/> Create a category</summary><label htmlFor="new-category">New category name</label><div><input id="new-category" maxLength={40} value={newCategory} placeholder="e.g. Politics or Technology" onChange={event => setNewCategory(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (newCategory.trim()) void addCategory(); } }}/><button type="button" disabled={categoryBusy || !newCategory.trim()} onClick={() => void addCategory()}>{categoryBusy ? 'Adding...' : 'Add'}</button></div><small>Saved for future posts and selected for this story.</small>{categoryError && <p role="alert" className="owner-error">{categoryError}</p>}</details>}</div><div><label htmlFor="author">Author</label><input id="author" maxLength={100} value={editor.author} onChange={e => update('author', e.target.value)}/></div></div><label htmlFor="slug">Story URL</label><div className="slug-field"><span>/stories/</span><input id="slug" maxLength={100} value={editor.slug || ''} placeholder={slugify(editor.title) || 'your-story-title'} onChange={e => update('slug', slugify(e.target.value))}/></div><small>Generated from the title unless you enter your own. Keep it stable after publishing.</small><label htmlFor="excerpt">Short excerpt <span>{editor.excerpt.length}/350</span></label><textarea id="excerpt" rows={3} maxLength={350} placeholder="The introduction readers see on the homepage…" value={editor.excerpt} onChange={e => update('excerpt', e.target.value)}/></section><section className="editor-section" id="story-cover"><div className="section-intro"><span>02</span><div><h3>Make a strong first impression</h3><p>Add a clear photograph with a description and the right credit.</p></div></div><label htmlFor="cover">Cover photograph</label><div className="cover-upload">{editor.cover ? <><Image src={editor.cover} alt={editor.coverAlt || 'Cover preview'} width={800} height={450} unoptimized/><button type="button" onClick={() => { update('cover', ''); update('coverAlt', ''); update('coverCredit', undefined); }}>Remove cover</button></> : <><ImagePlus size={30}/><span>Upload your story’s cover photograph</span></>}<input id="cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }}/><small>JPG, PNG or WebP · Up to 3 MB</small></div>{editor.cover && <><label htmlFor="cover-alt">Image description</label><input id="cover-alt" required maxLength={200} placeholder="Describe what the image shows" value={editor.coverAlt} onChange={e => update('coverAlt', e.target.value)}/></>}{editor.cover && <><label htmlFor="cover-credit">Photograph credit / licence</label><input id="cover-credit" maxLength={200} value={editor.coverCredit?.text || ''} placeholder="Photographer, source and licence or permission" onChange={e => update('coverCredit', { text: e.target.value, url: editor.coverCredit?.url || '' })}/><label htmlFor="cover-credit-url">Credit / licence link</label><input id="cover-credit-url" type="url" value={editor.coverCredit?.url || ''} onChange={e => update('coverCredit', { text: editor.coverCredit?.text || '', url: e.target.value })}/></>}</section><section className="editor-section" id="story-content"><div className="section-intro"><span>03</span><div><h3>Bring your story to life</h3><p>Write, format and add links or images using the toolbar.</p></div></div><div className="body-label"><label htmlFor="body">Full article</label><span className="editor-word-count">{wordCount(editor.body, editor.bodyFormat)} words ? {Math.max(1, Math.ceil(wordCount(editor.body, editor.bodyFormat) / 200))} min read</span></div><RichTextEditor value={editor.body} format={editor.bodyFormat} disabled={disabled || archived} onUploading={setUploading} onChange={value => { setEditor(post => ({ ...post, body: value, bodyFormat: 'rich-v1' })); setDirty(true); setNotice(''); }}/><small id="article-editor-help">Select text to format it. Use the toolbar for headings, links and images. Ctrl+B for bold, Ctrl+I for italic, Ctrl+Z to undo.</small></section><section className="editor-section" id="story-publishing"><div className="section-intro"><span>04</span><div><h3>Prepare to share</h3><p>Choose where your story appears, then review before publishing.</p></div></div><label htmlFor="video">YouTube video URL <span>Optional</span></label><input id="video" type="url" placeholder="https://www.youtube.com/watch?v=…" value={editor.video} onChange={e => update('video', e.target.value)}/>{canPublish ? <div className="placement-options"><label htmlFor="homepage-placement">Homepage placement</label><select id="homepage-placement" value={editor.spotlight === true || (editor.featured && editor.spotlight === undefined && editor.category === 'Music') ? 'spotlight' : editor.featured ? 'featured' : 'none'} onChange={event=>{setEditor(post=>({...post,featured:event.target.value!=='none',spotlight:event.target.value==='spotlight',...(event.target.value==='spotlight'?{category:'Music'}:{})}));setDirty(true);setNotice('');}}><option value="none">Regular story</option><option value="spotlight">Artist Spotlight - five-slide carousel</option><option value="featured">Featured Story - main homepage feature</option></select><small>Artist Spotlight uses Music and requires a cover photo. Selected spotlight stories rotate on the homepage, up to five slides. Recent Music stories fill spare slots. Featured Story sets the opening slide.</small><label><input type="checkbox" checked={editor.trending} onChange={e => update('trending', e.target.checked)}/><span><strong>Add to Trending Stories</strong><small>Show in the sidebar and headline ticker when published.</small></span></label></div> : <p className="author-review-note">Save your draft for review. An editor or the owner chooses homepage placement and publishes it.</p>}</section></fieldset>{!archived && !publishedReadOnly && <section className="publishing-checklist" aria-label="Publishing checklist"><div className="checklist-heading"><h3><CircleCheck size={18}/> Ready to publish?</h3><span>{checks.filter(item => item.ready).length} of {checks.length} complete</span></div><progress max={checks.length} value={checks.filter(item => item.ready).length} aria-label="Publishing readiness"/><ul>{checks.map(item => <li key={item.label} className={item.ready ? 'complete' : ''}><span aria-hidden="true">{item.ready ? <Check size={13}/> : <span className="checklist-dot"/>}</span>{item.label}<span className="sr-only">{item.ready ? ': complete' : ': needed'}</span></li>)}</ul><p>Recommended: add an approved cover photo, check facts and image rights, and preview before publishing.</p></section>}{error && <p className="owner-error" role="alert">{error}</p>}{notice && <p className="owner-success" role="status"><Check size={17}/>{notice}</p>}<div className="editor-actions">{!archived && !publishedReadOnly && <><button className="secondary-button" type="button" disabled={disabled} onClick={() => save(editor.status === 'published' ? 'published' : 'draft', true)}><Eye size={17}/> Save & preview</button><button className="secondary-button" type="submit" disabled={disabled}><Save size={17}/>{editor.status === 'published' ? 'Save changes' : 'Save draft'}</button>{canPublish && <button className="primary-button" type="button" disabled={disabled || (editor.status !== 'published' && !readyToPublish)} onClick={() => { if (editor.status === 'published') { if (window.confirm('Unpublish this story? It will become a private draft.')) void save('draft'); } else void save('published'); }}><Send size={17}/>{busy ? 'Saving…' : uploading ? 'Uploading…' : editor.status === 'published' ? 'Unpublish' : 'Publish post'}</button>}</>}{editor.id && <><button className="secondary-button" type="button" disabled={disabled} onClick={duplicate}><Copy size={17}/> Duplicate</button>{!publishedReadOnly && <button className="secondary-button" type="button" disabled={disabled} onClick={() => changeArchive(archived)}>{archived ? <RotateCcw size={17}/> : <Archive size={17}/>}{archived ? 'Restore to drafts' : 'Archive story'}</button>}</>}</div>{editor.id && <div className="saved-links"><Link href={`/admin/preview/${editor.id}`}>Preview saved version</Link>{editor.status === 'published' && <Link href={`/stories/${editor.slug}`} target="_blank">View published story ↗</Link>}</div>}</form></section></div></main></div>;
}
