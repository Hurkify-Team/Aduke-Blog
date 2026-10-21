import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rm, rmdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { getSchema } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { EditorState } from '@tiptap/pm/state';
import ts from 'typescript';
const folder = 'scripts/.link-test-' + Date.now();
await mkdir(folder);
try {
  for (const name of ['rich-text','editor-link']) {
    const source = (await readFile('src/lib/' + name + '.ts','utf8')).replace("'./rich-text'", "'./rich-text.mjs'");
    await writeFile(folder + '/' + name + '.mjs', ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
  }
  const { namedLinkTransaction, linkAddress } = await import(pathToFileURL(process.cwd() + '/' + folder + '/editor-link.mjs'));
  const schema = getSchema([StarterKit]);
  let state = EditorState.create({schema,doc:schema.nodeFromJSON({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Read this now'}]}]})});
  state = state.apply(namedLinkTransaction(state,{from:6,to:10},'the interview','www.example.com/interview'));
  assert.equal(state.doc.textContent,'Read the interview now');
  let linked = state.doc.firstChild.child(1);
  assert.equal(linked.text,'the interview');
  assert.equal(linked.marks.find(mark=>mark.type.name==='link').attrs.href,'https://www.example.com/interview');
  state = state.apply(namedLinkTransaction(state,{from:6,to:19},'the interview','https://example.com/updated'));
  assert.equal(state.doc.textContent,'Read the interview now');
  state = state.apply(namedLinkTransaction(state,{from:23,to:23},' More','https://example.com/more'));
  assert.ok(state.doc.textContent.endsWith('More'));
  for (const value of ['javascript:alert(1)','not a url','data:text/html,x']) assert.equal(linkAddress(value),null);
  assert.throws(()=>namedLinkTransaction(state,{from:1,to:1},'','https://example.com'));
  console.log('PASS: named link insertion, replacement, URL editing, readable labels and unsafe-address rejection.');
} finally {
  for (const name of ['rich-text','editor-link']) await rm(folder+'/'+name+'.mjs',{force:true});
  await rmdir(folder);
}
