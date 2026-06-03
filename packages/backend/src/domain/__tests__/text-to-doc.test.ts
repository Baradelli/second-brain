import { describe, expect, it } from 'vitest';

import { docToText } from '../doc-to-text.js';
import { textToDoc } from '../text-to-doc.js';

describe('textToDoc', () => {
  it('converte texto simples em doc com um parágrafo', () => {
    const doc = textToDoc('ideia simples');
    expect(doc).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ideia simples' }] }],
    });
  });

  it('texto com quebras de linha vira múltiplos parágrafos', () => {
    const doc = textToDoc('linha 1\nlinha 2\nlinha 3');
    expect(doc).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'linha 1' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'linha 2' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'linha 3' }] },
      ],
    });
  });

  it('round-trip com docToText preserva o conteúdo (texto simples)', () => {
    const text = 'comprar leite';
    expect(docToText(textToDoc(text))).toBe(text);
  });

  it('round-trip com docToText preserva o conteúdo (texto com quebras)', () => {
    const text = 'linha 1\nlinha 2';
    expect(docToText(textToDoc(text))).toBe(text);
  });
});
