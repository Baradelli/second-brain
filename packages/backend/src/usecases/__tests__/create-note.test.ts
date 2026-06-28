import { createNoteSchema } from '@cerebro/shared';
import { describe, expect, it } from 'vitest';

import { NoteLinkRepositoryFake } from '../_fakes/note-link-repository-fake.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { CreateNote } from '../create-note.js';

const baseInput = {
  userId: 'user-1',
  type: 'NOTE' as const,
  date: new Date('2026-06-02T00:00:00.000Z'),
  doc: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Oi' }] }],
  },
};

function setup() {
  const repo = new NoteRepositoryFake();
  const linkRepo = new NoteLinkRepositoryFake();
  const useCase = new CreateNote(repo, linkRepo);
  return { repo, linkRepo, useCase };
}

describe('CreateNote', () => {
  it('creates a note with minimal fields and returns id + ACTIVE status', async () => {
    const { useCase } = setup();

    const note = await useCase.execute(baseInput);

    expect(note.id).toBeTruthy();
    expect(note.status).toBe('ACTIVE');
    expect(note.userId).toBe('user-1');
    expect(note.createdAt).toBeInstanceOf(Date);
  });

  it('derives plainText from doc content', async () => {
    const { useCase } = setup();
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'world' },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second line' }] },
      ],
    };

    const note = await useCase.execute({ ...baseInput, doc });

    expect(note.plainText).toBe('Hello world\nSecond line');
  });

  it('defaults scope to DAY when not provided', async () => {
    const { useCase } = setup();

    const note = await useCase.execute(baseInput);

    expect(note.scope).toBe('DAY');
  });

  it('returns empty plainText for empty doc', async () => {
    const { useCase } = setup();

    const note = await useCase.execute({
      ...baseInput,
      doc: { type: 'doc', content: [] },
    });

    expect(note.plainText).toBe('');
  });

  it('calls repo.save exactly once with the assembled note', async () => {
    const { repo, useCase } = setup();

    await useCase.execute(baseInput);

    expect(repo.saved).toHaveLength(1);
    expect(repo.saved[0].userId).toBe('user-1');
    expect(repo.saved[0].status).toBe('ACTIVE');
  });

  it('recomputes outgoing links from mentions in the doc', async () => {
    const { linkRepo, useCase } = setup();
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'ver ' },
            { type: 'mention', attrs: { id: 'note-a', label: 'A' } },
            { type: 'mention', attrs: { id: 'note-b', label: 'B' } },
          ],
        },
      ],
    };

    const note = await useCase.execute({ ...baseInput, doc });

    const edges = await linkRepo.listGraphEdges('user-1');
    expect(edges.map((e) => e.toNoteId).sort()).toEqual(['note-a', 'note-b']);
    expect(edges.every((e) => e.fromNoteId === note.id)).toBe(true);
  });

  it('persists no links when the doc has no mentions', async () => {
    const { linkRepo, useCase } = setup();

    await useCase.execute(baseInput);

    expect(await linkRepo.listGraphEdges('user-1')).toEqual([]);
  });

  it('dedupes repeated mentions into a single outgoing link', async () => {
    const { linkRepo, useCase } = setup();
    const doc = {
      type: 'doc',
      content: [
        { type: 'mention', attrs: { id: 'dup' } },
        { type: 'mention', attrs: { id: 'dup' } },
      ],
    };

    const note = await useCase.execute({ ...baseInput, doc });

    expect(await linkRepo.listGraphEdges('user-1')).toEqual([
      { fromNoteId: note.id, toNoteId: 'dup' },
    ]);
  });
});

describe('createNoteSchema (shared)', () => {
  it('rejects invalid type', () => {
    const result = createNoteSchema.safeParse({
      ...baseInput,
      type: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid scope', () => {
    const result = createNoteSchema.safeParse({
      ...baseInput,
      scope: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid input', () => {
    const result = createNoteSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
  });
});
