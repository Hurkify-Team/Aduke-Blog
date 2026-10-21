import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = await mkdtemp(path.join(tmpdir(), 'aduke-production-'));
const origin = 'http://127.0.0.1:3018';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3018'], { windowsHide: true, env: { ...process.env, ADUKE_DATA_DIR: directory, ADUKE_DEMO_CONTENT: 'false', SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', VERCEL: '' }, stdio: 'ignore' });
try {
  let response;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error('Test server exited.');
    try { response = await fetch(origin); if (response.ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(response?.ok);
  const home = await response.text();
  assert.ok(!home.includes('Wizkid hints at new album'));
  assert.ok(home.includes('Explore Stories'));
  assert.equal((await fetch(origin + '/stories/wizkid-hints-at-new-album-and-fans-go-wild')).status, 404);
  assert.ok((await (await fetch(origin + '/robots.txt')).text()).includes('Disallow: /admin'));
  assert.ok(!(await (await fetch(origin + '/sitemap.xml')).text()).includes('/stories/'));
  console.log('PASS: production sample exclusion, empty states, demo route privacy, robots and sitemap.');
} finally {
  if (server.exitCode === null) { const exited = new Promise(resolve => server.once('exit', resolve)); server.kill(); await exited; }
  await rmdir(directory);
}
