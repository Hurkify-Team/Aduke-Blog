import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

// Runs against an isolated local data directory; never touches the owner's account.
const directory = await mkdtemp(path.join(tmpdir(), 'aduke-cms-test-'));
const origin = 'http://localhost:3017';
let server, output = '', cookie = '', uploaded;
const checks = [];
function check(name, result) { assert.ok(result, name); checks.push(name); }
async function start() {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3017'], { cwd: process.cwd(), env: { ...process.env, ADUKE_DATA_DIR: directory, ADUKE_DEMO_CONTENT: 'true', SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', VERCEL: '', GEMINI_API_KEY: '' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', data => { output += data; }); server.stderr.on('data', data => { output += data; });
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(`Test server failed: ${output}`);
    try { if ((await fetch(origin + '/admin')).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Test server did not start: ${output}`);
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise(resolve => server.once('exit', resolve)); server.kill(); await exited;
}
async function request(url, { method = 'GET', body, authenticated = true, requestOrigin = origin, form } = {}) {
  return fetch(origin + url, { method, redirect: 'manual', headers: { ...(method !== 'GET' ? { Origin: requestOrigin } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(authenticated && cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : form });
}
async function save(post) { const response = await request('/api/admin/posts', { method: 'POST', body: post }); const data = await response.json(); assert.equal(response.status, 200, JSON.stringify(data)); return data; }
try {
  await start();
  check('Admin setup page renders', (await (await request('/admin')).text()).includes('Your newsroom starts here.'));
  check('Anonymous post access rejected', (await request('/api/admin/posts', { authenticated: false })).status === 401);
  check('Anonymous post writes rejected', (await request('/api/admin/posts', { method: 'POST', body: {}, authenticated: false })).status === 401);
  check('Anonymous uploads rejected', (await request('/api/admin/upload', { method: 'POST', authenticated: false })).status === 401);
  check('Anonymous imports rejected', (await request('/api/admin/import', { authenticated: false })).status === 401);
  check('Anonymous import writes rejected', (await request('/api/admin/import', { method: 'POST', body: {}, authenticated: false })).status === 401);
  const password = randomBytes(24).toString('hex');
  check('Cross-origin account setup rejected', (await request('/api/admin/auth', { method: 'POST', body: { action: 'setup', password }, requestOrigin: 'https://example.org' })).status === 400);
  const setup = await request('/api/admin/auth', { method: 'POST', body: { action: 'setup', password } });
  assert.equal(setup.status, 200, await setup.clone().text());
  cookie = setup.headers.get('set-cookie').split(';')[0];
  check('Session uses HttpOnly and strict same-site cookies', /HttpOnly/i.test(setup.headers.get('set-cookie')) && /SameSite=strict/i.test(setup.headers.get('set-cookie')));
  check('Owner setup cannot be repeated', (await request('/api/admin/auth', { method: 'POST', body: { action: 'setup', password } })).status === 400);
  check('Authenticated editor renders', (await (await request('/admin')).text()).includes('Stories worth sharing.'));
  const editorHtml = await (await request('/admin')).text();
  check('Owner editor includes a publishing checklist', editorHtml.includes('Ready to publish?'));
  check('Owner library includes archived stories', editorHtml.includes('archived'));
  check('Importer reports missing API key', (await (await request('/api/admin/import')).json()).configured === false);
  check('Cross-origin imports rejected', (await request('/api/admin/import', { method: 'POST', body: { url: 'https://example.com', action: 'preview' }, requestOrigin: 'https://example.org' })).status === 400);
  check('Private network import rejected', (await request('/api/admin/import', { method: 'POST', body: { url: 'http://127.0.0.1', action: 'preview' } })).status === 400);
  check('Unconfigured generation has clear response', (await request('/api/admin/import', { method: 'POST', body: { url: 'https://example.com', action: 'draft' } })).status === 503);
  const input = { source: { url: 'https://example.com/original-report', publisher: 'Reference publisher', title: 'Original report', importedAt: new Date().toISOString(), publishedAt: '' }, title: 'Publishing workflow verification', slug: 'publishing-workflow-verification', category: 'Music', author: 'Test editor', excerpt: 'A temporary automated test story.', body: 'A private draft verification token: DRAFT_CONTENT_CHECK.\n\n## Test section\n\n<script>alert(1)</script>\n\n- First item\n- Second item', cover: '', coverAlt: '', video: '', status: 'draft', featured: true, trending: true };
  let post = await save(input);
  post = await save({ ...post, source: null });
  check('Saved source attribution survives editing', post.source.publisher === 'Reference publisher');
  check('Draft is absent from public homepage', !(await (await request('/')).text()).includes(input.title));
  check('Draft article URL is private', (await request('/stories/' + post.slug, { authenticated: false })).status === 404);
  check('Draft preview requires authentication', [307, 303].includes((await request('/admin/preview/' + post.id, { authenticated: false })).status));
  check('Owner can preview saved draft', (await (await request('/admin/preview/' + post.id)).text()).includes('DRAFT_CONTENT_CHECK'));
  check('Cross-origin post writes rejected', (await request('/api/admin/posts', { method: 'POST', body: { ...post, status: 'published' }, requestOrigin: 'https://example.org' })).status === 400);
  check('Duplicate URL slugs rejected', (await request('/api/admin/posts', { method: 'POST', body: input })).status === 400);
  check('Incomplete article cannot publish', (await request('/api/admin/posts', { method: 'POST', body: { ...post, body: '', status: 'published' } })).status === 400);
  check('Unsafe image URLs rejected', (await request('/api/admin/posts', { method: 'POST', body: { ...post, cover: 'javascript:alert(1)' } })).status === 400);
  const invalid = new FormData(); invalid.set('image', new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'test.svg');
  check('SVG uploads rejected', (await request('/api/admin/upload', { method: 'POST', form: invalid })).status === 400);
  const form = new FormData(); form.set('image', new Blob([await readFile('public/images/logo.png')], { type: 'image/png' }), 'cover.png');
  const upload = await request('/api/admin/upload', { method: 'POST', form }); const image = await upload.json(); assert.equal(upload.status, 200, JSON.stringify(image)); uploaded = image.url;
  check('Uploaded cover is served', (await request(uploaded)).status === 200);
  check('Uploaded cover can be optimised', (await request('/_next/image?url=' + encodeURIComponent(uploaded) + '&w=640&q=75')).status === 200);
  check('Invalid upload filenames are rejected', (await request('/uploads/not-an-image.svg')).status === 404);
  post = await save({ ...post, status: 'published', cover: uploaded, coverAlt: 'Test brand cover' });
  const home = await (await request('/')).text();
  check('Published post appears on homepage', home.includes(post.title));
  const {load}=await import('cheerio');
  check('Featured post opens Spotlight carousel', load(home)('.spotlight-slide:not([hidden]) h1').text()===post.title);
  check('Public article renders full text', (await (await request('/stories/' + post.slug, { authenticated: false })).text()).includes('DRAFT_CONTENT_CHECK'));
  const story = await (await request('/stories/' + post.slug, { authenticated: false })).text();
  check('HTML in article text is escaped', story.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  check('Article metadata is generated', story.includes('og:type') && story.includes('article:published_time'));
  const richBody = JSON.stringify({ type: 'doc', content: [
    { type: 'heading', attrs: { level: 2, textAlign: 'center' }, content: [{ type: 'text', text: 'Rich article heading' }] },
    { type: 'paragraph', attrs: { textAlign: 'justify' }, content: [
      { type: 'text', text: 'This bold article text is long enough to satisfy the publishing requirement. ', marks: [{ type: 'bold' }] },
      { type: 'text', text: 'Italic text', marks: [{ type: 'italic' }] },
      { type: 'text', text: 'Trusted source', marks: [{ type: 'link', attrs: { href: 'https://example.com/source' } }] },
      { type: 'text', text: '<script>alert(1)</script>' },
    ] },
    { type: 'image', attrs: { src: uploaded, alt: 'An inline story photograph' } },
  ] });
  let richPost = await save({ ...input, title: 'Rich editor verification', slug: 'rich-editor-verification', body: richBody, bodyFormat: 'rich-v1', status: 'published', featured: false, trending: false });
  const richHtml = await (await request('/stories/' + richPost.slug)).text();
  check('Rich headings retain alignment', richHtml.includes('text-align:center') && richHtml.includes('Rich article heading'));
  check('Bold and italic render in articles', richHtml.includes('<strong>This bold') && richHtml.includes('<em>Italic text</em>'));
  check('Rich links render safely', richHtml.includes('href="https://example.com/source"') && richHtml.includes('noopener noreferrer'));
  check('Inline images render with descriptions', richHtml.includes('alt="An inline story photograph"'));
  check('Rich article text escapes HTML', richHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  const malicious = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Unsafe link', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }] });
  check('Unsafe rich links rejected by the server', (await request('/api/admin/posts', { method: 'POST', body: { ...richPost, body: malicious } })).status === 400);
  check('Formatting cannot bypass minimum article text', (await request('/api/admin/posts', { method: 'POST', body: { ...richPost, body: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', attrs: { textAlign: 'center' } }] }) } })).status === 400);
  richPost = await save({ ...richPost, status: 'draft' });
  check('Stale edits cannot overwrite a newer save', (await request('/api/admin/posts', { method: 'POST', body: { ...post, updatedAt: 'outdated' } })).status === 400);
  await stop(); await start();
  check('Post survives a server restart', (await request('/stories/' + post.slug)).status === 200);
  check('Owner session survives a server restart', (await request('/api/admin/posts')).status === 200);
  const previousSlug = post.slug;
  post = await save({ ...post, slug: previousSlug + '-updated' });
  const moved = await request('/stories/' + previousSlug, { authenticated: false });
  check('Renamed published URLs redirect to the current article', moved.status === 308 && moved.headers.get('location')?.endsWith(post.slug));
  check('Retired slugs cannot be claimed by another post', (await request('/api/admin/posts', { method: 'POST', body: { ...input, slug: previousSlug } })).status === 400);
  const sitemap = await (await request('/sitemap.xml')).text();
  check('Sitemap includes published stories', sitemap.includes(post.slug));
  check('Article includes structured data', (await (await request('/stories/' + post.slug)).text()).includes('application/ld+json'));
  check('Anonymous archive action rejected', (await request('/api/admin/posts', { method: 'PATCH', body: { id: post.id, updatedAt: post.updatedAt, action: 'archive' }, authenticated: false })).status === 401);
  check('Cross-origin archive action rejected', (await request('/api/admin/posts', { method: 'PATCH', body: { id: post.id, updatedAt: post.updatedAt, action: 'archive' }, requestOrigin: 'https://example.org' })).status === 400);
  const originalPublishedAt = post.publishedAt;
  const archived = await request('/api/admin/posts', { method: 'PATCH', body: { id: post.id, updatedAt: post.updatedAt, action: 'archive' } });
  assert.equal(archived.status, 200); post = await archived.json();
  check('Archive preserves story content', post.status === 'archived' && post.body === input.body);
  check('Archived article is not public', (await request('/stories/' + post.slug, { authenticated: false })).status === 404);
  check('Archived article is removed from homepage', !(await (await request('/')).text()).includes(post.title));
  check('Archived article is removed from sitemap', !(await (await request('/sitemap.xml')).text()).includes(post.slug));
  check('Archived stories cannot be published directly', (await request('/api/admin/posts', { method: 'POST', body: { ...post, status: 'published' } })).status === 400);
  check('Stale restore action rejected', (await request('/api/admin/posts', { method: 'PATCH', body: { id: post.id, updatedAt: 'outdated', action: 'restore' } })).status === 400);
  const restored = await request('/api/admin/posts', { method: 'PATCH', body: { id: post.id, updatedAt: post.updatedAt, action: 'restore' } });
  assert.equal(restored.status, 200); post = await restored.json();
  check('Restore returns a private draft with no homepage placements', post.status === 'draft' && !post.featured && !post.trending);
  check('Restored story retains its original publication date', post.publishedAt === originalPublishedAt);
  check('Restored draft is still private', (await request('/stories/' + post.slug, { authenticated: false })).status === 404);
  post = await save({ ...post, status: 'published' });
  check('Restored story can publish again', (await request('/stories/' + post.slug)).status === 200);
  post = await save({ ...post, status: 'draft' });
  check('Unpublishing removes public article access', (await request('/stories/' + post.slug, { authenticated: false })).status === 404);
  check('Unpublishing removes homepage card', !(await (await request('/')).text()).includes(post.title));
  const logout = await request('/api/admin/auth', { method: 'DELETE' });
  check('Owner can sign out', logout.status === 200);
  check('Sign-out invalidates existing session tokens', (await request('/api/admin/posts')).status === 401);
  check('Wrong password rejected', (await request('/api/admin/auth', { method: 'POST', body: { password: 'incorrect-password' } })).status === 401);
  check('Owner can sign back in', (await request('/api/admin/auth', { method: 'POST', body: { password } })).status === 200);
  const renewedLogin = await request('/api/admin/auth', { method: 'POST', body: { password } });
  cookie = renewedLogin.headers.get('set-cookie').split(';')[0];
  const oldCookie = cookie;
  const newPassword = randomBytes(24).toString('hex');
  const changed = await request('/api/admin/auth', { method: 'PATCH', body: { currentPassword: password, newPassword } });
  check('Owner can change password', changed.status === 200);
  cookie = oldCookie;
  check('Password change revokes previous sessions', (await request('/api/admin/posts')).status === 401);
  check('Previous password no longer works', (await request('/api/admin/auth', { method: 'POST', body: { password } })).status === 401);
  check('New password works', (await request('/api/admin/auth', { method: 'POST', body: { password: newPassword } })).status === 200);
  check('Demonstration article route works', (await request('/stories/wizkid-hints-at-new-album-and-fans-go-wild')).status === 200);
  console.log(`PASS: ${checks.length} publishing checks\n` + checks.map(name => `  ✓ ${name}`).join('\n'));
} catch (error) { console.error(error); console.error(output.slice(-4000)); process.exitCode = 1; }
finally {
  await stop();
  // Only exact files created by this script are removed; never recurse into user data.
  if (uploaded && /^\/uploads\/[a-f0-9-]+\.png$/.test(uploaded)) await rm(path.join(process.cwd(), 'public', uploaded), { force: true });
  for (const filename of ['owner.json', 'posts.json', 'login-attempts.json', 'import-limit.json']) await rm(path.join(directory, filename), { force: true });
  await rmdir(directory).catch(() => undefined);
}
