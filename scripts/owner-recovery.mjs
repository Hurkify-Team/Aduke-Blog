import { randomBytes,createHash } from 'node:crypto';
import { readFile,writeFile,rename,mkdir } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const rawOrigin=process.argv[2]||'https://hurkify-team-aduke-blog.vercel.app';
const origin=new URL(rawOrigin);if(origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/'||!(origin.protocol==='https:'||origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)))throw Error('Provide a valid HTTPS site origin (or localhost for local recovery).');
const token=randomBytes(32).toString('hex'),recovery={hash:createHash('sha256').update(token).digest('hex'),expires:Date.now()+30*60*1000};
const source=(await readFile('src/lib/cloud.ts','utf8')).replace("import 'server-only';",'');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const cloud=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
if(cloud.cloudEnabled())await cloud.cloudTransaction(async()=>{if(!await cloud.cloudRead('owner.json',null))throw Error('No existing owner account found.');await cloud.cloudWrite('owner-recovery.json',recovery);});
else{const folder=path.resolve(process.env.ADUKE_DATA_DIR||'data');await readFile(path.join(folder,'owner.json'));await mkdir(folder,{recursive:true});const target=path.join(folder,'owner-recovery.json'),temp=target+'.tmp';await writeFile(temp,JSON.stringify(recovery),{mode:0o600});await rename(temp,target);}
const file=path.resolve('.owner-recovery-link.txt');await writeFile(file,`${origin.origin}/admin/recover#token=${token}\n\nPrivate owner recovery link. Expires in 30 minutes; single use. Never share or commit this file.\n`,{mode:0o600});
console.log('Recovery link saved privately to '+file+'. Open that file and follow its link within 30 minutes. The existing password is unchanged until you use the link.');
