import { beforeEach, describe, expect, it } from 'vitest';

import { NoteNotFoundError } from '../../domain/errors.js';
import type { Note } from '../../domain/note.js';
import { NoteLinkRepositoryFake } from '../_fakes/note-link-repository-fake.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { EditNote } from '../edit-note.js';

function makeNote(overrides?: Partial<Note>): Note {
  return {
    id: 'note-1',
    userId: 'user-1',
    type: 'NOTE',
    scope: 'DAY',
    date: new Date('2026-06-02T00:00:00.000Z'),
    doc: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'original' }] },
      ],
    },
    plainText: 'original',
    status: 'ACTIVE',
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    ...overrides,
  };
}

function docMentioning(...ids: string[]): Record<string, unknown> {
  return {
    type: 'doc',
    content: ids.map((id) => ({ type: 'mention', attrs: { id } })),
  };
}

describe('EditNote', () => {
  let repo: NoteRepositoryFake;
  let linkRepo: NoteLinkRepositoryFake;
  let useCase: EditNote;

  beforeEach(() => {
    repo = new NoteRepositoryFake();
    linkRepo = new NoteLinkRepositoryFake();
    useCase = new EditNote(repo, linkRepo);
  });

  it('editing title preserves all other fields unchanged', async () => {
    await repo.save(makeNote());

    const result = await useCase.execute({ id: 'note-1', userId: 'user-1', title: 'New Title' });

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
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Updated ', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'text' },
          ],
        },
      ],
    };

    const result = await useCase.execute({ id: 'note-1', userId: 'user-1', doc: newDoc });

    expect(result.plainText).toBe('Updated text');
    expect(result.doc).toEqual(newDoc);
  });

  it('throws NoteNotFoundError for unknown id', async () => {
    await expect(useCase.execute({ id: 'ghost', userId: 'user-1' })).rejects.toThrow(
      NoteNotFoundError,
    );
  });

  it('recomputes outgoing links when the doc gains mentions', async () => {
    await repo.save(makeNote());

    await useCase.execute({ id: 'note-1', userId: 'user-1', doc: docMentioning('a', 'b') });

    const edges = await linkRepo.listGraphEdges('user-1');
    expect(edges.map((e) => e.toNoteId).sort()).toEqual(['a', 'b']);
    expect(edges.every((e) => e.fromNoteId === 'note-1')).toBe(true);
  });

  it('recomputes (removes) outgoing links when mentions are removed', async () => {
    await repo.save(makeNote());
    await useCase.execute({ id: 'note-1', userId: 'user-1', doc: docMentioning('a', 'b') });

    await useCase.execute({ id: 'note-1', userId: 'user-1', doc: docMentioning('a') });

    expect(await linkRepo.listGraphEdges('user-1')).toEqual([
      { fromNoteId: 'note-1', toNoteId: 'a' },
    ]);
  });

  it('clears outgoing links when the doc edited to have no mentions', async () => {
    await repo.save(makeNote());
    await useCase.execute({ id: 'note-1', userId: 'user-1', doc: docMentioning('a') });

    await useCase.execute({
      id: 'note-1',
      userId: 'user-1',
      doc: { type: 'doc', content: [] },
    });

    expect(await linkRepo.listGraphEdges('user-1')).toEqual([]);
  });

  it('drops a self-mention (a note does not link to itself)', async () => {
    await repo.save(makeNote());

    await useCase.execute({ id: 'note-1', userId: 'user-1', doc: docMentioning('note-1', 'a') });

    expect(await linkRepo.listGraphEdges('user-1')).toEqual([
      { fromNoteId: 'note-1', toNoteId: 'a' },
    ]);
  });

  it('does not touch links when the doc is not part of the edit', async () => {
    await repo.save(makeNote());
    await useCase.execute({ id: 'note-1', userId: 'user-1', doc: docMentioning('a') });

    await useCase.execute({ id: 'note-1', userId: 'user-1', title: 'Only title' });

    expect(await linkRepo.listGraphEdges('user-1')).toEqual([
      { fromNoteId: 'note-1', toNoteId: 'a' },
    ]);
  });
});
