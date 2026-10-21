export type RichMark = { type: string; attrs?: Record<string, string> };
export type RichNode = { type: string; text?: string; attrs?: Record<string, string | number>; marks?: RichMark[]; content?: RichNode[] };
export const richBodyFormat = 'rich-v1' as const;
const blocks = ['paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote', 'horizontalRule', 'image'];
export function textColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (/^#[a-f0-9]{6}$/i.test(value)) return value.toLowerCase();
  const rgb = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!rgb || rgb.slice(1).some(channel => Number(channel) > 255)) return null;
  return '#' + rgb.slice(1).map(channel => Number(channel).toString(16).padStart(2, '0')).join('');
}
export function safeLink(value: string) {
  try {
    const url = new URL(value);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) && !/[\u0000-\u0020]/.test(value) && !url.username && !url.password;
  } catch { return false; }
}
export function validateRichBody(body: string): RichNode {
  const input: unknown = JSON.parse(body);
  let count = 0;
  function visit(value: unknown, parent: string, depth: number): RichNode {
    if (++count > 5000 || depth > 20 || !value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Article formatting is too complex.');
    const node = value as Record<string, unknown>;
    const type = String(node.type);
    const allowed = parent === '' ? ['doc'] : ['paragraph', 'heading'].includes(parent) ? ['text', 'hardBreak'] : ['bulletList', 'orderedList'].includes(parent) ? ['listItem'] : blocks;
    if (!allowed.includes(type)) throw new Error('Unsupported article formatting.');
    const clean: RichNode = { type };
    const attrs = (node.attrs && typeof node.attrs === 'object' ? node.attrs : {}) as Record<string, unknown>;
    if (type === 'text') {
      if (typeof node.text !== 'string' || !node.text.length) throw new Error('Invalid article text.');
      clean.text = node.text;
      if (node.marks !== undefined) {
        if (!Array.isArray(node.marks) || node.marks.length > 8) throw new Error('Invalid text formatting.');
        clean.marks = node.marks.map((mark): RichMark => {
          if (!mark || !['bold', 'italic', 'underline', 'strike', 'link', 'textStyle'].includes(mark.type)) throw new Error('Unsupported text formatting.');
          if (mark.type === 'textStyle') {
            const color = textColor(mark.attrs?.color);
            if (!color) throw new Error('Choose a valid text colour.');
            return { type: 'textStyle', attrs: { color } };
          }
          if (mark.type === 'link') {
            if (typeof mark.attrs?.href !== 'string' || mark.attrs.href.length > 2000 || !safeLink(mark.attrs.href)) throw new Error('Use a valid https, http or email link.');
            return { type: 'link', attrs: { href: mark.attrs.href } };
          }
          return { type: mark.type };
        });
      }
    }
    if (['paragraph', 'heading'].includes(type) && attrs.textAlign != null) {
      if (!['left', 'center', 'right', 'justify'].includes(String(attrs.textAlign))) throw new Error('Invalid text alignment.');
      clean.attrs = { textAlign: String(attrs.textAlign) };
    }
    if (type === 'heading') {
      if (![2, 3, 4].includes(Number(attrs.level))) throw new Error('Choose a heading or subheading.');
      clean.attrs = { ...clean.attrs, level: Number(attrs.level) };
    }
    if (type === 'orderedList' && attrs.start != null) {
      if (!Number.isInteger(attrs.start) || Number(attrs.start) < 1 || Number(attrs.start) > 10000) throw new Error('Invalid numbered list.');
      clean.attrs = { start: Number(attrs.start) };
    }
    if (type === 'image') {
      if (typeof attrs.src !== 'string' || !/^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(attrs.src)) throw new Error('Upload article images using the editor.');
      if (typeof attrs.alt !== 'string' || !attrs.alt.trim() || attrs.alt.length > 200) throw new Error('Add a description for every article image.');
      clean.attrs = { src: attrs.src, alt: attrs.alt.trim() };
    }
    if (!['text', 'image', 'horizontalRule', 'hardBreak'].includes(type)) {
      if (node.content !== undefined && !Array.isArray(node.content)) throw new Error('Invalid article structure.');
      clean.content = ((node.content || []) as unknown[]).map(child => visit(child, type, depth + 1));
      if (['doc', 'bulletList', 'orderedList', 'listItem', 'blockquote'].includes(type) && !clean.content.length) throw new Error('Invalid empty article block.');
      if (type === 'listItem' && clean.content[0]?.type !== 'paragraph') throw new Error('Start each list item with a paragraph.');
    }
    return clean;
  }
  return visit(input, '', 0);
}
export function plainDocument(body: string): RichNode {
  const content: RichNode[] = body.split(/\n\s*\n/).filter(Boolean).map(block => {
    const heading = block.match(/^(#{2,4}) ([\s\S]*)/);
    if (heading) return { type: 'heading', attrs: { level: heading[1].length }, content: heading[2] ? [{ type: 'text', text: heading[2] }] : [] };
    if (block.split('\n').every(line => line.startsWith('- '))) return { type: 'bulletList', content: block.split('\n').map(line => ({ type: 'listItem', content: [{ type: 'paragraph', content: line.slice(2) ? [{ type: 'text', text: line.slice(2) }] : [] }] })) };
    return { type: 'paragraph', content: block.split('\n').flatMap((text, index) => [...(index ? [{ type: 'hardBreak' }] : []), ...(text ? [{ type: 'text', text }] : [])]) };
  });
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}
export function bodyText(body: string, format?: string): string {
  if (format !== richBodyFormat) return body;
  try {
    function text(node: RichNode): string { return node.text || (node.type === 'hardBreak' ? '\n' : (node.content || []).map(text).join(['paragraph', 'heading'].includes(node.type) ? '' : ' ')); }
    return text(validateRichBody(body));
  } catch { return ''; }
}
export function wordCount(body: string, format?: string) { return bodyText(body, format).trim().split(/\s+/).filter(Boolean).length; }
