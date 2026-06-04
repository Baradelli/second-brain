import { afterEach, describe, expect, it } from 'vitest';

import { clearDraft, draftKey, loadDraft, saveDraft } from '../note-draft.js';

afterEach(() => {
  localStorage.clear();
});

describe('note-draft', () => {
  it('monta a chave por id ou por tipo (nota nova)', () => {
    expect(draftKey('note-1', 'NOTE')).toBe('cerebro.draft.note.note-1');
    expect(draftKey(null, 'DEVOTIONAL')).toBe('cerebro.draft.note.new:DEVOTIONAL');
  });

  it('salva e restaura o doc', () => {
    const key = draftKey('note-1', 'NOTE');
    const doc = { type: 'doc', content: [{ type: 'paragraph' }] };

    saveDraft(key, doc);
    expect(loadDraft(key)).toEqual(doc);
  });

  it('retorna null quando não há rascunho', () => {
    expect(loadDraft(draftKey('sem-rascunho', 'NOTE'))).toBeNull();
  });

  it('clear remove o rascunho', () => {
    const key = draftKey('note-1', 'NOTE');
    saveDraft(key, { type: 'doc' });
    clearDraft(key);
    expect(loadDraft(key)).toBeNull();
  });
});
