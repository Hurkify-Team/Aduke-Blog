import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,readdir,rm,rmdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const folder='scripts/.recovery-test-'+Date.now();await mkdir(folder);
const previous={...process.env},realFetch=globalThis.fetch,realError=console.error;
Object.assign(process.env,{SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',VERCEL:'',ADUKE_DATA_DIR:process.cwd()+'/'+folder+'/data',NEXT_PUBLIC_SITE_URL:'https://news.example.test',OWNER_RECOVERY_EMAIL:'owner@example.test',AUTH_EMAIL_FROM:'Aduke <security@example.test>',RESEND_API_KEY:'test-not-a-real-key'});
try{
 const modules=[['cloud','src/lib/cloud.ts'],['rich-text','src/lib/rich-text.ts'],['post','src/types/post.ts'],['team','src/types/team.ts'],['store','src/lib/store.ts'],['config','src/lib/config.ts'],['recovery-email','src/lib/recovery-email.ts']];
 for(const [name,file]of modules){let source=(await readFile(file,'utf8')).replace("import 'server-only';",'');for(const id of ['cloud','rich-text','store','config'])source=source.replaceAll("'./"+id+"'","'./"+id+".mjs'");for(const id of ['post','team'])source=source.replaceAll("'@/types/"+id+"'","'./"+id+".mjs'");await writeFile(folder+'/'+name+'.mjs',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);}
 const {readData,writeData,serialized}=await import(pathToFileURL(process.cwd()+'/'+folder+'/store.mjs'));
 const {normalEmail,emailRecoveryConfigured,requestOwnerRecovery}=await import(pathToFileURL(process.cwd()+'/'+folder+'/recovery-email.mjs'));
 assert.equal(normalEmail(' OWNER@example.test '),'owner@example.test');assert.equal(normalEmail('bad address'),'');
 assert.equal(emailRecoveryConfigured(),true);process.env.RESEND_API_KEY='';assert.equal(emailRecoveryConfigured(),false);process.env.RESEND_API_KEY='test-not-a-real-key';
 process.env.VERCEL='1';process.env.NEXT_PUBLIC_SITE_URL='http://localhost:3000';assert.equal(emailRecoveryConfigured(),false);process.env.VERCEL='';process.env.NEXT_PUBLIC_SITE_URL='https://news.example.test';
 await serialized(()=>writeData('owner.json',{secret:'existing-owner-secret'}));
 const sent=[];globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');sent.push({body:JSON.parse(options.body),headers:options.headers});return Response.json({id:'mock-email'});};
 await requestOwnerRecovery('stranger@example.test');assert.equal(sent.length,0);assert.equal(await readData('owner-email-recovery.json',null),null);
 await requestOwnerRecovery('OWNER@example.test');assert.equal(sent.length,1);assert.deepEqual(sent[0].body.to,['owner@example.test']);
 const link=sent[0].body.text.match(/https:\/\/news\.example\.test\/admin\/recover#token=([a-f0-9]{64})/);assert.ok(link);
 const state=await readData('owner-email-recovery.json',null);assert.equal(state.hash,createHash('sha256').update(link[1]).digest('hex'));assert.equal(state.binding,createHash('sha256').update('existing-owner-secret').digest('hex'));assert.equal(state.delivery,'sent');assert.ok(state.expires>Date.now()&&state.expires<=Date.now()+30*60*1000);assert.ok(!JSON.stringify(state).includes(link[1]));
 await requestOwnerRecovery('owner@example.test');assert.equal(sent.length,1,'Cooldown avoids repeated mail');
 await serialized(()=>writeData('owner-email-recovery.json',{...state,requestedAt:0}));await requestOwnerRecovery('owner@example.test');assert.equal(sent.length,2);assert.notEqual(sent[0].headers['Idempotency-Key'],sent[1].headers['Idempotency-Key']);
 let latest=await readData('owner-email-recovery.json',null);await serialized(()=>writeData('owner-email-recovery.json',{...latest,requestedAt:0}));
 console.error=()=>{};globalThis.fetch=async()=>Response.json({error:'Unavailable'},{status:503});await requestOwnerRecovery('owner@example.test');latest=await readData('owner-email-recovery.json',null);assert.equal(latest.delivery,'failed');assert.equal(latest.expires,0);assert.equal(latest.requestedAt,0);
 await serialized(()=>writeData('owner-email-limit.json',{count:100,reset:Date.now()+60000}));const before=latest.hash;await requestOwnerRecovery('owner@example.test');assert.equal((await readData('owner-email-recovery.json',null)).hash,before);
 console.log('PASS: fixed recipient, trusted HTTPS origin, hashed 30-minute tokens, cooldown, request limit, delivery failures and mocked Resend transport. No real emails sent.');
}finally{
 globalThis.fetch=realFetch;console.error=realError;
 for(const key of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','VERCEL','ADUKE_DATA_DIR','NEXT_PUBLIC_SITE_URL','OWNER_RECOVERY_EMAIL','AUTH_EMAIL_FROM','RESEND_API_KEY']){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
 try{for(const file of await readdir(folder+'/data'))await rm(folder+'/data/'+file);await rmdir(folder+'/data');}catch(error){if(error.code!=='ENOENT')throw error;}
 for(const file of await readdir(folder))await rm(folder+'/'+file);await rmdir(folder);
}
