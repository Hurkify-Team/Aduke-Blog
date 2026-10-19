import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
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
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3017'], { cwd: process.cwd(), env: { ...process.env, ADUKE_DATA_DIR: directory }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
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
  const password = randomBytes(24).toString('hex');
  check('Cross-origin account setup rejected', (await request('/api/admin/auth', { method: 'POST', body: { action: 'setup', password }, requestOrigin: 'https://example.org' })).status === 400);
  const setup = await request('/api/admin/auth', { method: 'POST', body: { action: 'setup', password } });
  assert.equal(setup.status, 200, await setup.clone().text());
  cookie = setup.headers.get('set-cookie').split(';')[0];
  check('Session uses HttpOnly and strict same-site cookies', /HttpOnly/i.test(setup.headers.get('set-cookie')) && /SameSite=strict/i.test(setup.headers.get('set-cookie')));
  check('Owner setup cannot be repeated', (await request('/api/admin/auth', { method: 'POST', body: { action: 'setup', password } })).status === 400);
  check('Authenticated editor renders', (await (await request('/admin')).text()).includes('Stories worth sharing.'));
  const input = { title: 'Publishing workflow verification', slug: 'publishing-workflow-verification', category: 'Music', author: 'Test editor', excerpt: 'A temporary automated test story.', body: 'A private draft verification token: DRAFT_CONTENT_CHECK.\n\n## Test section\n\n<script>alert(1)</script>\n\n- First item\n- Second item', cover: '', coverAlt: '', video: '', status: 'draft', featured: true, trending: true };
  let post = await save(input);
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
  post = await save({ ...post, status: 'published', cover: uploaded, coverAlt: 'Test brand cover' });
  const home = await (await request('/')).text();
  check('Published post appears on homepage', home.includes(post.title));
  check('Featured post controls hero', home.includes('published-hero-title'));
  check('Public article renders full text', (await (await request('/stories/' + post.slug, { authenticated: false })).text()).includes('DRAFT_CONTENT_CHECK'));
  const story = await (await request('/stories/' + post.slug, { authenticated: false })).text();
  check('HTML in article text is escaped', story.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  check('Article metadata is generated', story.includes('og:type') && story.includes('article:published_time'));
  check('Stale edits cannot overwrite a newer save', (await request('/api/admin/posts', { method: 'POST', body: { ...post, updatedAt: 'outdated' } })).status === 400);
  await stop(); await start();
  check('Post survives a server restart', (await request('/stories/' + post.slug)).status === 200);
  check('Owner session survives a server restart', (await request('/api/admin/posts')).status === 200);
  post = await save({ ...post, status: 'draft' });
  check('Unpublishing removes public article access', (await request('/stories/' + post.slug, { authenticated: false })).status === 404);
  check('Unpublishing removes homepage card', !(await (await request('/')).text()).includes(post.title));
  const logout = await request('/api/admin/auth', { method: 'DELETE' });
  check('Owner can sign out', logout.status === 200);
  check('Sign-out invalidates existing session tokens', (await request('/api/admin/posts')).status === 401);
  check('Wrong password rejected', (await request('/api/admin/auth', { method: 'POST', body: { password: 'incorrect-password' } })).status === 401);
  check('Owner can sign back in', (await request('/api/admin/auth', { method: 'POST', body: { password } })).status === 200);
  check('Demonstration article route works', (await request('/stories/wizkid-hints-at-new-album-and-fans-go-wild')).status === 200);
  console.log(`PASS: ${checks.length} publishing checks\n` + checks.map(name => `  ✓ ${name}`).join('\n'));
} catch (error) { console.error(error); console.error(output.slice(-4000)); process.exitCode = 1; }
finally {
  await stop();
  // Only exact files created by this script are removed; never recurse into user data.
  if (uploaded && /^\/uploads\/[a-f0-9-]+\.png$/.test(uploaded)) await rm(path.join(process.cwd(), 'public', uploaded), { force: true });
  for (const filename of ['owner.json', 'posts.json']) await rm(path.join(directory, filename), { force: true });
  await rm(directory, { recursive: false }).catch(() => undefined);
}
