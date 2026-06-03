import { describe, expect, it } from 'vitest';

import { docToText } from '../../domain/doc-to-text.js';

describe('docToText', () => {
  it('returns empty string for empty doc', () => {
    const doc = { type: 'doc', content: [] };
    expect(docToText(doc)).toBe('');
  });

  it('extracts plain text from a single paragraph', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    };
    expect(docToText(doc)).toBe('Hello world');
  });

  it('strips marks (bold, italic) and returns only text', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'world', marks: [{ type: 'italic' }] },
          ],
        },
      ],
    };
    expect(docToText(doc)).toBe('Hello world');
  });

  it('joins multiple paragraphs with newlines', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
      ],
    };
    expect(docToText(doc)).toBe('First\nSecond');
  });

  it('returns empty string for null/undefined input', () => {
    expect(docToText(null)).toBe('');
    expect(docToText(undefined)).toBe('');
  });
});
