import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';

type Snapshot = { version: number; files: Record<string, unknown> };
const transaction = new AsyncLocalStorage<Snapshot & { dirty: boolean }>();
export function cloudEnabled() {
  const enabled = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if ((process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) && !enabled) throw new Error('Configure both Supabase server environment variables.');
  if (process.env.VERCEL && !enabled) throw new Error('Persistent Supabase storage must be configured before deploying to Vercel.');
  return enabled;
}
export async function cloudRequest(endpoint: string, init: RequestInit = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Cloud storage is not configured.');
  const response = await fetch(`${url.replace(/\/$/, '')}${endpoint}`, {
    ...init, cache: 'no-store', headers: { apikey: key, Authorization: `Bearer ${key}`, ...init.headers },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Cloud storage request failed (${response.status}). Check the server configuration.`);
  return response;
}
async function snapshot(): Promise<Snapshot> {
  return (await cloudRequest('/rest/v1/rpc/aduke_read_state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
}
export async function cloudRead<T>(file: string, fallback: T): Promise<T> {
  const state = transaction.getStore() || await snapshot();
  return structuredClone((state.files[file] ?? fallback) as T);
}
export async function cloudWrite(file: string, value: unknown) {
  const state = transaction.getStore();
  if (!state) throw new Error('Cloud writes require a transaction.');
  state.files[file] = structuredClone(value); state.dirty = true;
}
export async function cloudTransaction<T>(fn: () => Promise<T>): Promise<T> {
  // Compare-and-swap in Postgres prevents lost updates across serverless instances.
  for (let attempt = 0; attempt < 5; attempt++) {
    const state = { ...await snapshot(), dirty: false };
    const result = await transaction.run(state, fn);
    if (!state.dirty) return result;
    const committed = await (await cloudRequest('/rest/v1/rpc/aduke_commit_state', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expected_version: state.version, next_files: state.files }),
    })).json();
    if (committed === true) return result;
  }
  throw new Error('The newsroom is busy. Please retry your change.');
}
export function uploadBucket() { return process.env.SUPABASE_UPLOAD_BUCKET || 'aduke-uploads'; }
