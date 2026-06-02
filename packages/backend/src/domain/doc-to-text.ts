interface ProseMirrorNode {
  type?: string;
  text?: string;
  content?: unknown[];
}

export function docToText(doc: unknown): string {
  if (doc === null || doc === undefined) return '';
  if (typeof doc !== 'object') return '';

  const node = doc as ProseMirrorNode;

  if (node.text) return node.text;

  if (!node.content || node.content.length === 0) return '';

  const parts = node.content.map(docToText).filter(Boolean);

  // doc/list-level nodes separate block children with newlines
  const newlineJoinTypes = ['doc', 'blockquote', 'bulletList', 'orderedList', 'codeBlock'];
  if (node.type && newlineJoinTypes.includes(node.type)) {
    return parts.join('\n');
  }

  // paragraph, heading, listItem: inline children joined without separator
  return parts.join('');
}
