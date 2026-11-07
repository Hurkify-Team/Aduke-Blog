import nextEnv from '@next/env';
import { isDeepStrictEqual } from 'node:util';
import { readFile, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
nextEnv.loadEnvConfig(process.cwd());
const apply = process.argv.includes('--apply');
const root = process.cwd();
async function run() {
  const base = process.env.SUPABASE_URL?.replace(/\/$/,'');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Supabase URL and server service-role key are required in .env.local.');
  if (new URL(base).protocol !== 'https:') throw new Error('Use your HTTPS Supabase project URL.');
  const bucket = process.env.SUPABASE_UPLOAD_BUCKET || 'aduke-uploads';
  async function request(endpoint, init = {}) {
    const response = await fetch(base + endpoint, {...init, headers:{apikey:key, Authorization:'Bearer '+key, ...init.headers}, signal:AbortSignal.timeout(90000)});
    if (!response.ok) throw new Error('Supabase request failed (HTTP '+response.status+'). Verify the project URL, service_role key, setup SQL and bucket.');
    return response;
  }
  const snapshot = () => request('/rest/v1/rpc/aduke_read_state',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(response=>response.json());
  const state = await snapshot();
  if (!state || !Number.isInteger(state.version) || !state.files || typeof state.files !== 'object') throw new Error('Unexpected Supabase state. Run the setup SQL first.');
  console.log('Supabase database connection verified.');
  if (Object.keys(state.files).length) throw new Error('Cloud newsroom already contains data. Migration stopped to avoid overwriting it.');
  const bucketInfo = await (await request('/storage/v1/bucket/'+encodeURIComponent(bucket))).json();
  if (bucketInfo.public !== false) throw new Error('The configured upload bucket must be private.');
  console.log('Private upload bucket verified.');
  const localDirectory = path.resolve(process.env.ADUKE_DATA_DIR || path.join(root,'data'));
  const files = {};
  for (const name of ['posts.json','owner.json','categories.json']) {
    try { files[name] = JSON.parse(await readFile(path.join(localDirectory,name),'utf8')); }
    catch(error) { if (error.code !== 'ENOENT' || name !== 'categories.json') throw new Error('Could not read local '+name+'. Migration stopped.'); }
  }
  if (!Array.isArray(files['posts.json']) || !files['owner.json']) throw new Error('Local posts and owner account are required.');
  const names = [...new Set([...JSON.stringify(files['posts.json']).matchAll(/\/uploads\/([a-f0-9-]+\.(?:jpg|png|webp))/g)].map(match=>match[1]))];
  const media = [];
  for (const name of names) {
    const bytes = await readFile(path.join(root,'public','uploads',name)).catch(()=>{throw new Error('A referenced local image is missing. Restore it before migration.');});
    media.push({name,bytes,hash:createHash('sha256').update(bytes).digest('hex')});
  }
  console.log('Local migration inventory: '+files['posts.json'].length+' posts, '+media.length+' referenced images, owner account'+(files['categories.json']?', custom categories.':'.'));
  if (!apply) { console.log('DRY RUN passed. No cloud data changed. Run with --apply to migrate into this empty newsroom.'); return; }
  const backup = path.join(root,'backups','pre-supabase-'+new Date().toISOString().replace(/[:.]/g,'-'));
  await mkdir(backup,{recursive:true});
  await cp(localDirectory,path.join(backup,'data'),{recursive:true,errorOnExist:true,force:false});
  await cp(path.join(root,'public','uploads'),path.join(backup,'uploads'),{recursive:true,errorOnExist:true,force:false});
  console.log('Private local backup created before migration.');
  for (let index=0;index<media.length;index+=1) {
    await Promise.all(media.slice(index,index+1).map(async image=>{
      const endpoint='/storage/v1/object/'+encodeURIComponent(bucket)+'/'+image.name;
      const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':image.name.endsWith('.jpg')?'image/jpeg':image.name.endsWith('.png')?'image/png':'image/webp','x-upsert':'false'};
      console.log('Transferring image '+(index+1)+'/'+media.length+' ('+Math.ceil(image.bytes.length/1024)+' KB)...');
      const upload=await fetch(base+endpoint,{method:'POST',headers,body:image.bytes,signal:AbortSignal.timeout(90000)});
      if (!upload.ok && ![400,409].includes(upload.status)) throw new Error('Image upload failed (HTTP '+upload.status+'). No newsroom data committed.');
      const downloaded=Buffer.from(await (await request(endpoint)).arrayBuffer());
      if (createHash('sha256').update(downloaded).digest('hex')!==image.hash) throw new Error('Uploaded image verification failed. No newsroom data committed.');
    }));
    console.log('Images uploaded and verified: '+Math.min(index+1,media.length)+'/'+media.length);
  }
  const fresh=await snapshot();
  if (Object.keys(fresh.files).length || fresh.version!==state.version) throw new Error('Cloud newsroom changed during migration. No data overwritten.');
  const committed=await (await request('/rest/v1/rpc/aduke_commit_state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expected_version:state.version,next_files:files})})).json();
  if (committed!==true) throw new Error('Cloud state changed. Migration did not overwrite it.');
  const verified=await snapshot();
  for (const name of Object.keys(files)) if (!isDeepStrictEqual(verified.files[name],files[name])) throw new Error('Cloud verification differs for '+name+'. Retain the backup and investigate.');
  console.log('SUCCESS: all posts, referenced images, categories and the existing owner account migrated and verified. Local originals retained.');
}
run().catch(error=>{console.error(error.name==='TimeoutError'?'Supabase connection timed out. Please retry.':error.message==='fetch failed'?'Could not reach Supabase. Check network access and project URL.':error.message);process.exitCode=1;});
