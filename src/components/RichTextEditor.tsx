'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { namedLinkTransaction } from '@/lib/editor-link';
import { Mark, getMarkRange } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, Link2, Unlink, ImagePlus, Undo2, Redo2, RemoveFormatting, SeparatorHorizontal } from 'lucide-react';
import { plainDocument, richBodyFormat, safeLink, textColor, validateRichBody } from '@/lib/rich-text';

const TextColour = Mark.create({
  name: 'textStyle',
  addAttributes() { return { color: { default: null, parseHTML: element => textColor(element.style.color), renderHTML: attributes => { const color = textColor(attributes.color); return color ? { style: `color: ${color}` } : {}; } } }; },
  parseHTML() { return [{ tag: 'span[style]', getAttrs: element => textColor((element as HTMLElement).style.color) ? {} : false }]; },
  renderHTML({ HTMLAttributes }) { return ['span', HTMLAttributes, 0]; },
});

type Props = { value: string; format?: string; disabled: boolean; onChange: (value: string) => void; onUploading: (uploading: boolean) => void };
function documentValue(value: string, format?: string) {
  if (format === richBodyFormat) { try { return validateRichBody(value); } catch { return plainDocument(''); } }
  return plainDocument(value);
}
export default function RichTextEditor({ value, format, disabled, onChange, onUploading }: Props) {
  const lastValue = useRef(value);
  const fileInput = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<'link' | 'image' | null>(null);
  const linkSelection = useRef<{ from: number; to: number } | null>(null);
  const [linkText, setLinkText] = useState('');
  const [href, setHref] = useState(''), [alt, setAlt] = useState(''), [message, setMessage] = useState('');
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      TextColour,
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, code: false, codeBlock: false, link: { openOnClick: false, autolink: false, defaultProtocol: 'https', isAllowedUri: url => safeLink(url) } }),
      ImageExtension.configure({ allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: documentValue(value, format),
    editable: !disabled,
    editorProps: { attributes: { id: 'body', role: 'textbox', 'aria-label': 'Full article', 'aria-multiline': 'true', 'aria-describedby': 'article-editor-help' } },
    onUpdate: ({ editor }) => { const next = JSON.stringify(editor.getJSON()); lastValue.current = next; onChange(next); },
  });
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  useEffect(() => {
    if (editor && value !== lastValue.current) {
      editor.commands.setContent(documentValue(value, format), { emitUpdate: false });
      lastValue.current = value; setPanel(null); setMessage('');
    }
  }, [editor, value, format]);
  function tool(label: string, icon: ReactNode, action: () => void, active = false, unavailable = false) {
    return <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled || !editor || unavailable} onMouseDown={event => event.preventDefault()} onClick={action}>{icon}</button>;
  }
  function openLink() {
    if (!editor) return;
    const selection = editor.state.selection;
    const range = selection.empty && editor.isActive('link')
      ? getMarkRange(selection.$from, editor.schema.marks.link) || selection
      : selection;
    linkSelection.current = { from: range.from, to: range.to };
    setLinkText(editor.state.doc.textBetween(range.from, range.to, ' '));
    setHref(editor.getAttributes('link').href || '');
    setPanel(panel === 'link' ? null : 'link'); setMessage('');
  }
  function insertLink() {
    if (!editor) return;
    try {
      editor.view.dispatch(namedLinkTransaction(editor.state, linkSelection.current || editor.state.selection, linkText, href));
      setPanel(null); setMessage('Link added. Save your story to keep it.'); linkSelection.current = null;
      editor.commands.focus();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not add this link.'); }
  }
  async function insertImage(file?: File) {
    if (!file || !editor) return;
    if (!alt.trim()) { setMessage('Describe the image before uploading it.'); return; }
    if (file.size > 3 * 1024 * 1024) { setMessage('Choose an image smaller than 3 MB.'); return; }
    onUploading(true); setMessage('Uploading image?');
    try {
      const form = new FormData(); form.set('image', file);
      const response = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Upload failed.');
      editor.chain().focus().setImage({ src: result.url, alt: alt.trim() }).run();
      setPanel(null); setAlt(''); setMessage('Image inserted. Save your story to keep it.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not upload image.'); }
    finally { onUploading(false); }
  }
  return <div className={`rich-editor${disabled ? ' is-disabled' : ''}`}>
    <div className="rich-toolbar" role="group" aria-label="Article formatting">
      <select aria-label="Paragraph style" disabled={disabled || !editor} value={editor?.isActive('heading', { level: 2 }) ? '2' : editor?.isActive('heading', { level: 3 }) ? '3' : editor?.isActive('heading', { level: 4 }) ? '4' : 'paragraph'} onChange={event => { if (event.target.value === 'paragraph') editor?.chain().focus().setParagraph().run(); else editor?.chain().focus().setHeading({ level: Number(event.target.value) as 2 | 3 | 4 }).run(); }}>
        <option value="paragraph">Normal text</option><option value="2">Heading</option><option value="3">Subheading</option><option value="4">Minor heading</option>
      </select>
      {tool('Bold (Ctrl+B)', <Bold/>, () => { editor?.chain().focus().toggleBold().run(); }, editor?.isActive('bold'))}
      {tool('Italic (Ctrl+I)', <Italic/>, () => { editor?.chain().focus().toggleItalic().run(); }, editor?.isActive('italic'))}
      {tool('Underline (Ctrl+U)', <Underline/>, () => { editor?.chain().focus().toggleUnderline().run(); }, editor?.isActive('underline'))}
      {tool('Strikethrough', <Strikethrough/>, () => { editor?.chain().focus().toggleStrike().run(); }, editor?.isActive('strike'))}
      <label className="text-colour-control" title="Text colour"><span>Text colour</span><input type="color" aria-label="Text colour" disabled={disabled || !editor} value={textColor(editor?.getAttributes('textStyle').color) || '#031239'} onChange={event => { editor?.chain().focus().setMark('textStyle', { color: event.target.value }).run(); }}/></label>
      {tool('Reset text colour', <RemoveFormatting/>, () => { editor?.chain().focus().unsetMark('textStyle').run(); })}
      <span className="toolbar-divider"/>
      {tool('Align left', <AlignLeft/>, () => { editor?.chain().focus().setTextAlign('left').run(); }, editor?.isActive({ textAlign: 'left' }))}
      {tool('Align centre', <AlignCenter/>, () => { editor?.chain().focus().setTextAlign('center').run(); }, editor?.isActive({ textAlign: 'center' }))}
      {tool('Align right', <AlignRight/>, () => { editor?.chain().focus().setTextAlign('right').run(); }, editor?.isActive({ textAlign: 'right' }))}
      {tool('Justify text', <AlignJustify/>, () => { editor?.chain().focus().setTextAlign('justify').run(); }, editor?.isActive({ textAlign: 'justify' }))}
      {tool('Bullet list', <List/>, () => { editor?.chain().focus().toggleBulletList().run(); }, editor?.isActive('bulletList'))}
      {tool('Numbered list', <ListOrdered/>, () => { editor?.chain().focus().toggleOrderedList().run(); }, editor?.isActive('orderedList'))}
      {tool('Quote', <Quote/>, () => { editor?.chain().focus().toggleBlockquote().run(); }, editor?.isActive('blockquote'))}
      <span className="toolbar-divider"/>
      {tool('Insert or edit link', <Link2/>, openLink, editor?.isActive('link'))}
      {tool('Remove link', <Unlink/>, () => { editor?.chain().focus().extendMarkRange('link').unsetLink().run(); }, false, !editor?.isActive('link'))}
      {tool('Insert image', <ImagePlus/>, () => { setAlt(editor?.getAttributes('image').alt || ''); setPanel(panel === 'image' ? null : 'image'); setMessage(''); })}
      {tool('Insert section divider', <SeparatorHorizontal/>, () => { editor?.chain().focus().setHorizontalRule().run(); })}
      {tool('Clear text formatting', <RemoveFormatting/>, () => { editor?.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().run(); })}
      {tool('Undo', <Undo2/>, () => { editor?.chain().focus().undo().run(); }, false, !editor?.can().undo())}
      {tool('Redo', <Redo2/>, () => { editor?.chain().focus().redo().run(); }, false, !editor?.can().redo())}
    </div>
    {panel === 'link' && <div className="rich-panel"><label htmlFor="article-link-text">Link text</label><input id="article-link-text" type="text" maxLength={500} placeholder="e.g. Read the full interview" value={linkText} onChange={event => setLinkText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); insertLink(); } }}/><label htmlFor="article-link-url">Link address</label><input id="article-link-url" type="text" inputMode="url" placeholder="https://example.com or www.example.com" value={href} onChange={event => setHref(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); insertLink(); } }}/><button type="button" disabled={disabled || !linkText.trim() || !href.trim()} onMouseDown={event => event.preventDefault()} onClick={insertLink}>Apply link</button><button type="button" onClick={() => setPanel(null)}>Cancel</button>{message && <p role="status">{message}</p>}</div>}
    {panel === 'image' && <div className="rich-panel"><label htmlFor="article-image-alt">Image description</label><input id="article-image-alt" maxLength={200} placeholder="Describe what this image shows" value={alt} onChange={event => setAlt(event.target.value)}/><button type="button" disabled={disabled || !alt.trim()} onClick={() => fileInput.current?.click()}>Upload and insert image</button>{editor?.isActive('image') && <button type="button" disabled={disabled || !alt.trim()} onClick={() => { editor.chain().focus().updateAttributes('image', { alt: alt.trim() }).run(); setPanel(null); }}>Update description</button>}<button type="button" onClick={() => setPanel(null)}>Cancel</button><small>JPG, PNG or WebP ? Up to 3 MB. Select an inserted image and press Delete to remove it.</small></div>}
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Upload an article image" disabled={disabled} onChange={event => { void insertImage(event.target.files?.[0]); event.target.value = ''; }}/>
    {!editor && <div className="editor-loading">Loading article editor?</div>}
    <EditorContent editor={editor}/>
    {message && <p className="rich-status" role="status">{message}</p>}
  </div>;
}
