import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
if (process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('This command backs up local files only. Use your Supabase database and Storage backup/export for cloud data.');
import { cp, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
const source = path.resolve(process.env.ADUKE_DATA_DIR || 'data');
const destination = path.resolve('backups', new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid);
// Stop the server first so credentials, articles and images form one consistent snapshot.
await stat(source);
await mkdir(destination, { recursive: true });
await cp(source, path.join(destination, 'data'), { recursive: true, errorOnExist: true, force: false });
try { await cp('public/uploads', path.join(destination, 'uploads'), { recursive: true, errorOnExist: true, force: false }); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
console.log(`Backup saved to ${destination}. Contains private account data; store securely.`);
