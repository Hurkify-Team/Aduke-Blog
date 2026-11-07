import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir,readdir,rm,rmdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const folder='scripts/.radar-test-'+Date.now();await mkdir(folder);
const prior={...process.env};
process.env.SUPABASE_URL='';process.env.SUPABASE_SERVICE_ROLE_KEY='';process.env.VERCEL='';process.env.ADUKE_DATA_DIR=process.cwd()+'/'+folder+'/data';
const realFetch=globalThis.fetch;
try{
 const modules=[['safe-fetch','src/lib/safe-fetch.ts'],['rich-text','src/lib/rich-text.ts'],['cloud','src/lib/cloud.ts'],['store','src/lib/store.ts'],['post','src/types/post.ts'],['team','src/types/team.ts'],['radar-types','src/types/radar.ts'],['news-radar','src/lib/news-radar.ts']];
 for(const [name,file] of modules){let source=(await readFile(file,'utf8')).replace("import 'server-only';",'');for(const id of ['safe-fetch','rich-text','cloud','store'])source=source.replaceAll("'./"+id+"'","'./"+id+".mjs'");for(const [id,target]of [['post','post'],['team','team'],['radar','radar-types']])source=source.replaceAll("'@/types/"+id+"'","'./"+target+".mjs'");if(name==='news-radar')source=source.replace("from './safe-fetch.mjs'","from './radar-network.mjs'").replace("from './news-import'","from './radar-articles.mjs'");await writeFile(folder+'/'+name+'.mjs',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);}
 await writeFile(folder+'/radar-network.mjs',"export {newsUrl} from './safe-fetch.mjs'; export async function publicPage(url){if(!globalThis.__radarFeeds[url])throw Error('Feed unavailable');return {status:200,text:globalThis.__radarFeeds[url]};}");
 await writeFile(folder+'/radar-articles.mjs',"export async function fetchNews(url){if(!globalThis.__radarArticles[url])throw Error('Restricted');return {text:globalThis.__radarArticles[url]};}");
 const {parseFeed,validateIdeas,brainstorm,radarFeeds,refreshRadar,radarState,compareIdea}=await import(pathToFileURL(process.cwd()+'/'+folder+'/news-radar.mjs'));
 const {serialized,writeData}=await import(pathToFileURL(process.cwd()+'/'+folder+'/store.mjs'));
 const now=Date.now();
 const rss=(url,title='Public music event announced',time=now)=>'<rss><channel><item><title>'+title+'</title><link>'+url+'</link><pubDate>'+new Date(time).toUTCString()+'</pubDate><description><![CDATA[<p>A public feed description.</p>]]></description></item></channel></rss>';
 const bbc=parseFeed(rss('https://www.bbc.com/news/articles/test?utm_source=rss'),radarFeeds[0],now);
 assert.equal(bbc.length,1);assert.equal(bbc[0].url,'https://www.bbc.com/news/articles/test');assert.equal(bbc[0].publisherId,'bbc');
 assert.equal(parseFeed(rss('https://www.bbc.com/news/articles/old','Old',now-49*60*60*1000),radarFeeds[0],now).length,0);
 assert.equal(parseFeed(rss('https://www.bbc.com/news/articles/future','Future',now+60*60*1000),radarFeeds[0],now).length,0);
 assert.equal(parseFeed(rss('http://127.0.0.1/private'),radarFeeds[0],now).length,0);
 assert.equal(parseFeed(rss('https://bbc.com.evil.example/news'),radarFeeds[0],now).length,0);
 assert.throws(()=>parseFeed('<!DOCTYPE x>'+rss('https://www.bbc.com/a'),radarFeeds[0],now));
 const idea={title:'Music event offers a new reporting angle',category:'Music',summary:'A public event announcement offers a potential music story. Confirm the organiser and practical details before reporting it as established fact.',whyNow:'The supplied feed item was published recently.',angle:'Ask organisers how the event supports local performers.',checks:['Confirm the official organiser.','Verify venue and date with primary evidence.'],outline:['What the announcement says','What remains uncertain','Questions for the organiser'],sourceIds:[bbc[0].id],captions:{instagram:'Draft suggestion: a music announcement raises questions about opportunities for local performers. Confirm official details before sharing.',tiktok:'Draft script: explain the announcement, identify what has not been verified, and ask the organiser for details.',facebook:'A recent music announcement could interest our community. Check the original source and await confirmation of practical details.',x:'Music story lead: verify the organiser and event details before publishing.'}};
 assert.equal(validateIdeas({ideas:[idea]},bbc,['Music'])[0].sourceIds[0],bbc[0].id);
 assert.throws(()=>validateIdeas({ideas:[{...idea,sourceIds:['invented']}]},bbc,['Music']),/unknown source/);
 assert.throws(()=>validateIdeas({ideas:[{...idea,summary:'This is verified authentic.'}]},bbc,['Music']),/guarantee/);
 assert.throws(()=>validateIdeas({ideas:[{...idea,category:'Unknown'}]},bbc,['Music']),/category/);
 delete process.env.GEMINI_API_KEY;await assert.rejects(()=>brainstorm(bbc,'Music'),/Configure/);
 process.env.GEMINI_API_KEY='test-not-a-real-key';
 globalThis.fetch=async(url,options)=>{assert.ok(url.startsWith('https://generativelanguage.googleapis.com/'));const body=JSON.parse(options.body);assert.equal(body.tools,undefined);assert.ok(body.systemInstruction.parts[0].text.includes('UNTRUSTED DATA'));return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({ideas:[idea]})}]}}]});};
 assert.equal((await brainstorm(bbc,'Music'))[0].title,idea.title);
 globalThis.__radarFeeds=Object.fromEntries(radarFeeds.map((feed,index)=>[feed.url,rss(feed.publisherId==='bbc'?'https://www.bbc.com/news/articles/test':'https://www.'+(feed.publisherId==='channels'?'channelstv.com':'premiumtimesng.com')+'/test','News lead '+index)]));
 const state=await refreshRadar();assert.equal(state.engine,'gemini');assert.ok(state.leads.length>=3);assert.equal(state.ideas.length,1);
 await assert.rejects(()=>refreshRadar(),/15 minutes/);
 globalThis.__radarArticles={[bbc[0].url]:'Readable source text about the announcement. This is source evidence, not independent verification.'};
 const compared=await compareIdea(state.ideas[0].id);assert.equal(compared.ideas[0].compared.sourceIds.length,1);
 const already=await compareIdea(state.ideas[0].id);assert.equal(already.ideas[0].compared.at,compared.ideas[0].compared.at);
 await serialized(()=>writeData('radar.json',{...compared,lastAttempt:0}));
 globalThis.__radarFeeds={};await assert.rejects(()=>refreshRadar(),/No recent/);assert.equal((await radarState()).checkedAt,state.checkedAt);assert.ok((await radarState()).error);
 await serialized(async()=>writeData('radar.json',{...(await radarState()),leaseUntil:Date.now()+60000}));await assert.rejects(()=>refreshRadar(),/already running/);
 console.log('PASS: RSS freshness, publisher identity, URL safety, source-bound ideas, no paid search tool, Gemini analysis, cache/rate limits, source comparison and failure retention.');
}finally{
 globalThis.fetch=realFetch;delete globalThis.__radarFeeds;delete globalThis.__radarArticles;
 for(const key of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','VERCEL','ADUKE_DATA_DIR','GEMINI_API_KEY']){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}
 try{for(const file of await readdir(folder+'/data'))await rm(folder+'/data/'+file);await rmdir(folder+'/data');}catch(error){if(error.code!=='ENOENT')throw error;}
 for(const file of await readdir(folder))await rm(folder+'/'+file);await rmdir(folder);
}
