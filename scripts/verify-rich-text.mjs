import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const compiled = ts.transpileModule(await readFile('src/lib/rich-text.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { validateRichBody, bodyText, wordCount, plainDocument, safeLink, textColor } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const paragraph = text => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const doc = { type: 'doc', content: [{ type: 'heading', attrs: { level: 2, textAlign: 'center' }, content: [{ type: 'text', text: 'A heading', marks: [{ type: 'bold' }] }] }, paragraph('Words for the article.'), { type: 'image', attrs: { src: '/uploads/abc-123.png', alt: 'An approved photograph', onerror: 'ignored' } }] };
const cleaned = validateRichBody(JSON.stringify(doc));
assert.equal(cleaned.content[0].attrs.textAlign, 'center');
assert.equal(cleaned.content[2].attrs.onerror, undefined);
assert.equal(wordCount(JSON.stringify(doc), 'rich-v1'), 6);
assert.ok(bodyText(JSON.stringify(doc), 'rich-v1').includes('A heading'));
assert.equal(bodyText('Existing text'), 'Existing text');
assert.equal(plainDocument('## Heading\n\n- One\n- Two').content[1].type, 'bulletList');
assert.equal(plainDocument('').content[0].type, 'paragraph');
for (const href of ['javascript:alert(1)', 'data:text/html,test', '//example.com', 'https://user:password@example.com']) assert.equal(safeLink(href), false);
for (const href of ['https://example.com', 'mailto:editor@example.com']) assert.equal(safeLink(href), true);
for (const invalid of [
  { type: 'script' },
  { type: 'doc', content: [{ type: 'image', attrs: { src: 'https://example.com/image.jpg', alt: 'No' } }] },
  { type: 'doc', content: [{ type: 'image', attrs: { src: '/uploads/abc.png', alt: '' } }] },
  { type: 'doc', content: [{ type: 'paragraph', attrs: { textAlign: 'expression(alert(1))' } }] },
  { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'unsafe', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }] },
]) assert.throws(() => validateRichBody(JSON.stringify(invalid)));
let nested = paragraph('Deep'); for (let i = 0; i < 25; i++) nested = { type: 'blockquote', content: [nested] };
assert.throws(() => validateRichBody(JSON.stringify({ type: 'doc', content: [nested] })));
console.log('PASS: rich formatting validation, plain-text compatibility, counts, safe links/images and complexity limits.');

const coloured = color => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Colour with bold', marks: [{ type: 'bold' }, { type: 'textStyle', attrs: { color, background: 'ignored' } }] }] }] });
assert.equal(validateRichBody(coloured('#A12B34')).content[0].content[0].marks[1].attrs.color, '#a12b34');
assert.equal(validateRichBody(coloured('rgb(3, 18, 57)')).content[0].content[0].marks[1].attrs.color, '#031239');
assert.equal(validateRichBody(coloured('#031239')).content[0].content[0].marks[1].attrs.background, undefined);
assert.equal(bodyText(coloured('#031239'), 'rich-v1'), 'Colour with bold');
for (const invalid of ['red; background:url(test)', 'expression(alert(1))', 'rgb(999,0,0)', 'url(javascript:alert(1))', null]) {
  assert.equal(textColor(invalid), null);
  assert.throws(() => validateRichBody(coloured(invalid)));
}
console.log('PASS: text colours persist with bold, normalise safely, preserve article text and reject arbitrary CSS.');
