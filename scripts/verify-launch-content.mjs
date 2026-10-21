import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const { stories } = JSON.parse(await readFile('content/researched-2026-10-21.json', 'utf8'));
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3019'], { windowsHide: true, env: { ...process.env, ADUKE_DEMO_CONTENT: 'false' }, stdio: 'ignore' });
const origin = 'http://127.0.0.1:3019';
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error('Review server exited.');
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready);
  const home = await (await fetch(origin)).text();
  assert.equal((home.match(/<article class="article-card"/g) || []).length, 9, 'Homepage initially shows nine cards');
  assert.ok(home.includes('Artist Spotlight') && home.includes('Femi Kuti and the enduring spirit of Felabration'));
  assert.ok(!home.includes('Design demonstration') && !home.includes('Photo pending'));
  assert.ok(home.includes('More stories') && home.includes('/credits'));
  const all = await (await fetch(origin + '/?view=all')).text();
  assert.equal((all.match(/<article class="article-card"/g) || []).length, 21, 'View All contains all 21 real posts');
  const posts = JSON.parse(await readFile('data/posts.json', 'utf8'));
  for (const item of stories) {
    const response = await fetch(origin + '/stories/' + item.slug);
    assert.equal(response.status, 200);
    const html = await response.text();
    for (const source of item.sources) assert.ok(html.includes(source.url.replaceAll('&', '&amp;')), 'Source link present: ' + source.label);
    assert.ok(html.includes('Sources &amp; credits'));
    const post = posts.find(post => post.slug === item.slug);
    assert.equal((await fetch(origin + post.cover)).status, 200);
    assert.equal((await fetch(origin + '/_next/image?url=' + encodeURIComponent(post.cover) + '&w=640&q=75')).status, 200);
  }
  const credits = await (await fetch(origin + '/credits')).text();
  assert.ok(credits.includes('Sylvain lasco') && credits.includes('creativecommons.org/licenses/by-sa/4.0/'));
  console.log('PASS: 21-post launch content, nine-card preview, full archive, featured artist, six article/source routes, all six covers and optimisation, and image attribution.');
} finally {
  if (server.exitCode === null) { const exited = new Promise(resolve => server.once('exit', resolve)); server.kill(); await exited; }
}
