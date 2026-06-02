import { describe, it, expect, beforeEach } from 'vitest';
import { EditNote } from '../edit-note.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { NoteNotFoundError } from '../../domain/errors.js';
import type { Note } from '../../domain/note.js';

function makeNote(overrides?: Partial<Note>): Note {
  return {
    id: 'note-1',
    userId: 'user-1',
    type: 'NOTE',
    scope: 'DAY',
    date: new Date('2026-06-02T00:00:00.000Z'),
    doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'original' }] }] },
    plainText: 'original',
    status: 'ACTIVE',
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    ...overrides,
  };
}

describe('EditNote', () => {
  let repo: NoteRepositoryFake;
  let useCase: EditNote;

  beforeEach(() => {
    repo = new NoteRepositoryFake();
    useCase = new EditNote(repo);
  });

  it('editing title preserves all other fields unchanged', async () => {
    await repo.save(makeNote());

    const result = await useCase.execute({ id: 'note-1', title: 'New Title' });

    expect(result.title).toBe('New Title');
    expect(result.plainText).toBe('original');
    expect(result.doc).toBeDefined();
    expect(result.userId).toBe('user-1');
    expect(result.type).toBe('NOTE');
  });

  it('editing doc re-derives plainText from new content', async () => {
    await repo.save(makeNote());
    const newDoc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Updated ', marks: [{ type: 'bold' }] }, { type: 'text', text: 'text' }] },
      ],
    };

    const result = await useCase.execute({ id: 'note-1', doc: newDoc });

    expect(result.plainText).toBe('Updated text');
    expect(result.doc).toEqual(newDoc);
  });

  it('throws NoteNotFoundError for unknown id', async () => {
    await expect(useCase.execute({ id: 'ghost' })).rejects.toThrow(NoteNotFoundError);
  });
});
