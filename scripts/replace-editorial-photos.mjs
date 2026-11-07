import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import sharp from 'sharp';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
function moduleUrl(source) { return 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText).toString('base64'); }
const richUrl = moduleUrl(await readFile('src/lib/rich-text.ts', 'utf8'));
const teamUrl = moduleUrl(await readFile('src/types/team.ts', 'utf8'));
const typesUrl = moduleUrl(await readFile('src/types/post.ts', 'utf8'));
const cloudUrl = moduleUrl((await readFile('src/lib/cloud.ts', 'utf8')).replace("import 'server-only';", ''));
const source = (await readFile('src/lib/store.ts', 'utf8')).replace("import 'server-only';", '').replaceAll("'./rich-text'", JSON.stringify(richUrl)).replaceAll("'./cloud'", JSON.stringify(cloudUrl)).replaceAll("'@/types/post'", JSON.stringify(typesUrl)).replaceAll("'@/types/team'", JSON.stringify(teamUrl));
const { allPosts, savePost } = await import(moduleUrl(source));
const { cloudEnabled } = await import(cloudUrl);
if (cloudEnabled()) throw new Error('Import this reviewed launch content locally first. Cloud migration is a separate step.');

const credits = JSON.parse(await readFile('content/real-photo-credits.json', 'utf8'));
const paragraph = text => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const link = (text, href) => ({ type: 'paragraph', content: [{ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] }] });
for (const credit of credits) {
  const post = (await allPosts()).find(post => post.slug === credit.slug);
  if (!post) throw new Error('Missing article: ' + credit.slug);
  const filename = randomUUID() + '.jpg';
  await copyFile('public/images/editorial/' + credit.master, 'public/uploads/' + filename);
  const body = JSON.parse(post.body);
  body.content = body.content.filter(node => !JSON.stringify(node).includes('Cover: original Aduke'));
  for (const node of body.content) for (const part of node.content || []) if (part.text) part.text = part.text.replace('The cover is an original screen-themed illustration, not a Netflix poster or film still.', 'The cover is an archive photograph of a Netflix stand in 2019, not a still from these titles.');
  if (!JSON.stringify(body).includes(credit.source)) body.content.push(paragraph(credit.caption + ' Original stored unchanged; responsive crops and optimised versions use the same licence. No endorsement implied.'), link('Photograph: ' + credit.author, credit.source), link(credit.license, credit.licenseUrl));
  await savePost({ ...post, cover: '/uploads/' + filename, coverAlt: credit.caption, body: JSON.stringify(body) }, post.id);
  console.log('Real photograph saved: ' + credit.slug);
}
