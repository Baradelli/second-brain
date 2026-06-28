import { describe, expect, it } from 'vitest';

import { extractMentionIds } from '../extract-mention-ids.js';

describe('extractMentionIds', () => {
  it('returns [] for non-object input', () => {
    expect(extractMentionIds(null)).toEqual([]);
    expect(extractMentionIds(undefined)).toEqual([]);
    expect(extractMentionIds('string')).toEqual([]);
    expect(extractMentionIds(42)).toEqual([]);
    expect(extractMentionIds(true)).toEqual([]);
  });

  it('returns [] for a doc with no mentions', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'no links' }] },
      ],
    };
    expect(extractMentionIds(doc)).toEqual([]);
  });

  it('collects a single mention id', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'see ' },
            { type: 'mention', attrs: { id: 'note-2', label: 'Outra' } },
          ],
        },
      ],
    };
    expect(extractMentionIds(doc)).toEqual(['note-2']);
  });

  it('collects mention ids nested deep in content', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'mention', attrs: { id: 'deep-note' } }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(extractMentionIds(doc)).toEqual(['deep-note']);
  });

  it('dedupes repeated mention ids preserving first-seen order', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'mention', attrs: { id: 'a' } },
        { type: 'mention', attrs: { id: 'b' } },
        { type: 'mention', attrs: { id: 'a' } },
      ],
    };
    expect(extractMentionIds(doc)).toEqual(['a', 'b']);
  });

  it('drops mentions with missing/empty/non-string id', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'mention', attrs: { id: '' } },
        { type: 'mention', attrs: { label: 'no id' } },
        { type: 'mention', attrs: { id: 123 } },
        { type: 'mention' },
        { type: 'mention', attrs: null },
        { type: 'mention', attrs: { id: 'valid' } },
      ],
    };
    expect(extractMentionIds(doc)).toEqual(['valid']);
  });

  it('ignores non-mention nodes that happen to carry an attrs.id', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { id: 'img-1' } },
        { type: 'mention', attrs: { id: 'note-9' } },
      ],
    };
    expect(extractMentionIds(doc)).toEqual(['note-9']);
  });

  it('tolerates malformed content arrays (non-object children)', () => {
    const doc = {
      type: 'doc',
      content: [null, 'text', 42, { type: 'mention', attrs: { id: 'ok' } }],
    };
    expect(extractMentionIds(doc)).toEqual(['ok']);
  });

  it('handles content that is not an array', () => {
    const doc = { type: 'doc', content: 'oops' };
    expect(extractMentionIds(doc)).toEqual([]);
  });

  it('collects from a mention node at the top level', () => {
    const doc = { type: 'mention', attrs: { id: 'top' } };
    expect(extractMentionIds(doc)).toEqual(['top']);
  });
});
