import { describe, expect, it } from 'vitest';

import { extractOutline } from '../outline.js';

describe('extractOutline', () => {
  it('returns an empty list when the doc has no headings', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Só um parágrafo.' }],
        },
      ],
    };
    expect(extractOutline(doc)).toEqual([]);
  });

  it('returns an empty list for an undefined or empty doc', () => {
    expect(extractOutline(undefined)).toEqual([]);
    expect(extractOutline({})).toEqual([]);
    expect(extractOutline({ type: 'doc' })).toEqual([]);
  });

  it('extracts headings in document order with their levels', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Introdução' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'corpo' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Detalhes' }],
        },
      ],
    };

    const outline = extractOutline(doc);
    expect(outline.map((h) => [h.level, h.text])).toEqual([
      [1, 'Introdução'],
      [2, 'Detalhes'],
    ]);
  });

  it('concatenates multiple text nodes inside a heading', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [
            { type: 'text', text: 'Parte ' },
            { type: 'text', text: 'um', marks: [{ type: 'bold' }] },
          ],
        },
      ],
    };
    expect(extractOutline(doc)[0]?.text).toBe('Parte um');
  });

  it('skips headings with empty or whitespace-only text', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [] },
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '   ' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Real' }],
        },
      ],
    };
    const outline = extractOutline(doc);
    expect(outline).toHaveLength(1);
    expect(outline[0]?.text).toBe('Real');
  });

  it('defaults to level 1 when the level attr is missing', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          content: [{ type: 'text', text: 'Sem nível' }],
        },
      ],
    };
    expect(extractOutline(doc)[0]?.level).toBe(1);
  });

  it('assigns stable, unique ids derived from position and text', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Tópico' }],
        },
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Tópico' }],
        },
      ],
    };
    const outline = extractOutline(doc);
    const ids = outline.map((h) => h.id);
    // Same text, different positions → ids must still be unique and stable.
    expect(new Set(ids).size).toBe(2);
    expect(extractOutline(doc).map((h) => h.id)).toEqual(ids);
  });
});
