import { TextSelection, type EditorState } from '@tiptap/pm/state';
import { safeLink } from './rich-text';
export function linkAddress(value: string): string | null {
  const trimmed = value.trim();
  const url = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i.test(trimmed) ? 'https://' + trimmed : '';
  return safeLink(url) ? url : null;
}
export function namedLinkTransaction(state: EditorState, range: { from: number; to: number }, label: string, value: string) {
  const href = linkAddress(value), text = label.trim();
  if (!href || !text) throw new Error('Enter link text and a valid website address.');
  const from = Math.max(1, Math.min(range.from, state.doc.content.size - 1));
  const to = Math.max(from, Math.min(range.to, state.doc.content.size - 1));
  const tr = state.tr;
  const link = state.schema.marks.link.create({ href });
  if (from !== to && state.doc.textBetween(from, to, ' ') === text) tr.addMark(from, to, link);
  else {
    const marks = (state.doc.nodeAt(from)?.marks || state.doc.resolve(from).marks()).filter(mark => mark.type.name !== 'link');
    tr.replaceWith(from, to, state.schema.text(text, [...marks, link]));
  }
  tr.setSelection(TextSelection.near(tr.doc.resolve(from + text.length)));
  tr.removeStoredMark(state.schema.marks.link);
  return tr;
}
