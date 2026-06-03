interface TextNode {
  type: 'text';
  text: string;
}

interface ParagraphNode {
  type: 'paragraph';
  content: TextNode[];
}

interface DocNode {
  type: 'doc';
  content: ParagraphNode[];
}

export function textToDoc(text: string): DocNode {
  const paragraphs = text.split('\n').map((line) => ({
    type: 'paragraph' as const,
    content: [{ type: 'text' as const, text: line }],
  }));

  return { type: 'doc', content: paragraphs };
}
