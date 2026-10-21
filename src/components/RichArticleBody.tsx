import { Fragment, type ReactNode, type CSSProperties } from 'react';
import Image from 'next/image';
import { validateRichBody, type RichNode } from '@/lib/rich-text';
export default function RichArticleBody({ body }: { body: string }) {
  let doc: RichNode;
  try { doc = validateRichBody(body); } catch { return <p>This article could not be displayed.</p>; }
  function render(node: RichNode, key: number): ReactNode {
    const children = node.content?.map(render);
    const style: CSSProperties = { textAlign: node.attrs?.textAlign as CSSProperties['textAlign'] };
    switch (node.type) {
      case 'doc': return <Fragment key={key}>{children}</Fragment>;
      case 'text': {
        let text: ReactNode = node.text;
        for (const mark of node.marks || []) {
          if (mark.type === 'textStyle') text = <span style={{ color: mark.attrs!.color }}>{text}</span>;
          if (mark.type === 'bold') text = <strong>{text}</strong>;
          if (mark.type === 'italic') text = <em>{text}</em>;
          if (mark.type === 'underline') text = <u>{text}</u>;
          if (mark.type === 'strike') text = <s>{text}</s>;
          if (mark.type === 'link') text = <a href={mark.attrs!.href} rel="noopener noreferrer">{text}</a>;
        }
        return <Fragment key={key}>{text}</Fragment>;
      }
      case 'paragraph': return <p key={key} style={style}>{children || <br/>}</p>;
      case 'heading': return node.attrs?.level === 2 ? <h2 key={key} style={style}>{children}</h2> : node.attrs?.level === 3 ? <h3 key={key} style={style}>{children}</h3> : <h4 key={key} style={style}>{children}</h4>;
      case 'bulletList': return <ul key={key}>{children}</ul>;
      case 'orderedList': return <ol key={key} start={Number(node.attrs?.start || 1)}>{children}</ol>;
      case 'listItem': return <li key={key}>{children}</li>;
      case 'blockquote': return <blockquote key={key}>{children}</blockquote>;
      case 'horizontalRule': return <hr key={key}/>;
      case 'hardBreak': return <br key={key}/>;
      case 'image': return <figure className="inline-story-image" key={key}><Image src={String(node.attrs!.src)} alt={String(node.attrs!.alt)} width={1200} height={800} sizes="(max-width:700px) 100vw, 800px"/></figure>;
    }
  }
  return <div className="article-body rich-article">{render(doc, 0)}</div>;
}
