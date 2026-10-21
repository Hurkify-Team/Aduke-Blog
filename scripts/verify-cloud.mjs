import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = (await readFile('src/lib/cloud.ts', 'utf8')).replace("import 'server-only';", '');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const cloud = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const originalFetch = globalThis.fetch;
process.env.SUPABASE_URL = 'https://test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
let state = { version: 0, files: { counter: 0 } }, collisions = 0;
globalThis.fetch = async (url, options) => {
  assert.equal(options.headers.Authorization, 'Bearer test-only');
  assert.equal(options.cache, 'no-store');
  if (url.endsWith('aduke_read_state')) return Response.json(structuredClone(state));
  const input = JSON.parse(options.body);
  if (input.expected_version !== state.version) { collisions++; return Response.json(false); }
  state = { version: state.version + 1, files: structuredClone(input.next_files) };
  return Response.json(true);
};
try {
  assert.equal(cloud.cloudEnabled(), true);
  await Promise.all(Array.from({ length: 4 }, () => cloud.cloudTransaction(async () => {
    const value = await cloud.cloudRead('counter', 0);
    await cloud.cloudWrite('counter', value + 1);
  })));
  assert.equal(state.files.counter, 4);
  assert.ok(collisions > 0, 'Concurrent writes must retry conflicting snapshots');
  await assert.rejects(cloud.cloudWrite('counter', 99), /transaction/);
  const version = state.version;
  assert.equal(await cloud.cloudTransaction(() => cloud.cloudRead('counter', 0)), 4);
  assert.equal(state.version, version, 'Read-only transactions must not write');
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';
  assert.throws(() => cloud.cloudEnabled(), /both/);
  process.env.SUPABASE_URL = ''; process.env.VERCEL = '1';
  assert.throws(() => cloud.cloudEnabled(), /Persistent/);
  console.log('PASS: cloud adapter concurrency, read-only, credential and deployment guards (mock transport).');
} finally { globalThis.fetch = originalFetch; }
