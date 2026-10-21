import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import sharp from 'sharp';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
function moduleUrl(source) { return 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText).toString('base64'); }
const richUrl = moduleUrl(await readFile('src/lib/rich-text.ts', 'utf8'));
const typesUrl = moduleUrl(await readFile('src/types/post.ts', 'utf8'));
const cloudUrl = moduleUrl((await readFile('src/lib/cloud.ts', 'utf8')).replace("import 'server-only';", ''));
const source = (await readFile('src/lib/store.ts', 'utf8')).replace("import 'server-only';", '').replaceAll("'./rich-text'", JSON.stringify(richUrl)).replaceAll("'./cloud'", JSON.stringify(cloudUrl)).replaceAll("'@/types/post'", JSON.stringify(typesUrl));
const { allPosts, savePost } = await import(moduleUrl(source));
const { cloudEnabled } = await import(cloudUrl);
if (cloudEnabled()) throw new Error('Import this reviewed launch content locally first. Cloud migration is a separate step.');
const { stories } = JSON.parse(await readFile('content/researched-2026-10-21.json', 'utf8'));
const updates = {
 'jide-kosoko-funke-akindele-movie-invitations-make-me-nervous': ['“Funke Akindele’s movie invitations make me nervous” — Jide Kosoko explains why', 'The veteran actor discusses Funke Akindele’s demanding filming process and praises her dedication to quality productions.'],
 'olamide-announces-13th-album-time-and-space-november-16-2026': ['Olamide announces 13th studio album Time & Space for November 16', 'The YBNL boss announces a 10-track project, following the release of lead single Burukutu.'],
 'nollywood-production-manager-oluwa9ice-alubarika-pm-reportedly-dies-in-ibadan': ['Nollywood production manager Oluwa9ice Alubarika PM reportedly dies in Ibadan', 'The industry mourns Oluwadarasimi Adamson, while the circumstances surrounding his reported death remain unconfirmed.'],
 'king-prime-announces-100000-business-support-winner-titilayo-olawuyi': ['King Prime names Titilayo Olawuyi as ₦100,000 business-support winner', 'A small-scale business support initiative offers financial assistance to its latest beneficiary.'],
 'prince-adeleye-mr-rolland-ebora-oluwanran-movie-october-28': ['Mr Rolland’s Ebora Oluwanran set for October 28 premiere', 'The forthcoming film explores courage, oppression and justice, with a 6 p.m. premiere announced for JimmyRollandTV.'],
 'oluwa9ice-colleagues-donations-fidau-prayer-movie-completion-artiste-day': ['Oluwa9ice’s colleagues seek support for memorial activities and movie completion', 'The appeal covers the Fidau prayer, completion of the 9ice movie and the planned 41 Days Artiste Day.'],
 'fatai-okoya-reconciliation-plea-father-razaq-okoya-40-years-apart': ['Fatai Okoya appeals for reconciliation with his father after four decades apart', 'The 66-year-old reportedly seeks forgiveness and a chance to rebuild his relationship with Chief Razaq Okoya.'],
 'adunni-ade-mourns-mother-passing-after-long-illness': ['Adunni Ade mourns her mother following a long illness', 'The Nollywood actress announces the passing of her mother.'],
 'kunle-agboola-500-young-people-jpi-state-youth-assembly-ogun': ['Kunle Agboola mobilises over 500 youths for JPI assembly in Ogun', 'The Ayetoro gathering brings young leaders and creatives together under the theme Big Vision, Bold Steps.'],
 'otedola-bridge-tanker-fire-extinguished-traffic-restored-lagos': ['Traffic restored after Otedola Bridge tanker fire in Lagos', 'Emergency teams bring the fire under control as LASEMA reports two injuries and continuing recovery operations.'],
 'ero-festival-okelusi-kingdom-2026': ['Ero Festival 2026: celebrating Okelusi Kingdom', 'A congratulatory message to the sons and daughters of Okelusi Kingdom.'],
 'happy-birthday-afro-pop-singer-enzi-boi': ['Celebrating Afro-pop singer Enzi Boi on his birthday', 'Birthday wishes to Enzi Boi, with warm regards from the Aduke Radio TV community.'],
 'toluwanisings-lives-on-support-late-gospel-singers-wife-children': ['Toluwanisings lives on: appeal launched for singer’s wife and children', 'A memorial appeal calls for support for the family of the late gospel singer and music minister.'],
 'broda-shaggi-returns-social-media-after-reported-shooting-incident': ['Broda Shaggi reportedly returns to social media after months away', 'Fans welcome the comedian’s online return, while details surrounding the reported shooting still require confirmation.'],
 'king-prime-donates-another-1-million-king-shina-ade-gratitude': ['King Prime announces another ₦1 million for King Shina Ade', 'The philanthropist says the singer’s expressions of gratitude encouraged him to offer further support.'],
};
for (const post of await allPosts()) {
  if (updates[post.slug]) {
    const [title, excerpt] = updates[post.slug];
    await savePost({ ...post, title, excerpt }, post.id);
  }
}
const photoCredits = JSON.parse(await readFile('content/real-photo-credits.json', 'utf8'));
await mkdir('public/uploads', { recursive: true });
await mkdir('public/images/editorial', { recursive: true });
const text = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
for (const item of stories) {
  if ((await allPosts()).some(post => post.slug === item.slug)) { console.log('Already imported:', item.slug); continue; }
  const filename = randomUUID() + '.jpg';
  if (item.art === 'photo') await copyFile('public/images/editorial/femi-kuti-original.jpg', 'public/uploads/' + filename);
  else {
    const credit = photoCredits.find(credit => credit.slug === item.slug);
    if (!credit) throw new Error('Missing licensed photograph: ' + item.slug);
    await copyFile('public/images/editorial/' + credit.master, 'public/uploads/' + filename);
  }
  const paragraph = text => ({ type: 'paragraph', content: [{ type: 'text', text }] });
  const link = (label, url) => ({ type: 'paragraph', content: [{ type: 'text', text: label, marks: [{ type: 'link', attrs: { href: url } }] }] });
  const content = item.paragraphs.map(paragraph);
  content.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Sources & credits' }] });
  content.push(paragraph('Original Aduke editorial brief. Sources checked on 21 October 2026.'));
  for (const source of item.sources) content.push(link(source.label, source.url));
  if (item.art === 'photo') {
    content.push(paragraph('Archive portrait: Sylvain lasco, 11 May 2013. Original stored unchanged; responsive display crops and optimised versions are adaptations licensed under CC BY-SA 4.0. No endorsement implied.'));
    content.push(link('Photograph and author credit — Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:Femi_Kuti.jpg'));
    content.push(link('Creative Commons Attribution–ShareAlike 4.0 licence', 'https://creativecommons.org/licenses/by-sa/4.0/'));
  } else { const credit = photoCredits.find(credit => credit.slug === item.slug); content.push(paragraph(credit.caption), link('Photograph: ' + credit.author, credit.source), link(credit.license, credit.licenseUrl)); }
  await savePost({ title: item.title, slug: item.slug, category: item.category, author: 'Aduke Editorial Team', excerpt: item.excerpt, body: JSON.stringify({ type: 'doc', content }), bodyFormat: 'rich-v1', cover: '/uploads/' + filename, coverAlt: item.art === 'photo' ? 'Femi Kuti in an archive portrait by Sylvain lasco, photographed in 2013; not a photograph of Felabration 2026.' : photoCredits.find(credit => credit.slug === item.slug).caption, video: '', status: 'published', featured: item.featured === true, trending: item.trending === true });
  console.log('Published:', item.slug);
}
console.log('Published total:', (await allPosts()).filter(post => post.status === 'published').length);
