import { createNoteSchema } from '@cerebro/shared';
import { describe, expect, it } from 'vitest';

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

describe('CreateNote', () => {
  it('creates a note with minimal fields and returns id + ACTIVE status', async () => {
    const repo = new NoteRepositoryFake();
    const useCase = new CreateNote(repo);

    const note = await useCase.execute(baseInput);

    expect(note.id).toBeTruthy();
    expect(note.status).toBe('ACTIVE');
    expect(note.userId).toBe('user-1');
    expect(note.createdAt).toBeInstanceOf(Date);
  });

  it('derives plainText from doc content', async () => {
    const repo = new NoteRepositoryFake();
    const useCase = new CreateNote(repo);
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
    const repo = new NoteRepositoryFake();
    const useCase = new CreateNote(repo);

    const note = await useCase.execute(baseInput);

    expect(note.scope).toBe('DAY');
  });

  it('returns empty plainText for empty doc', async () => {
    const repo = new NoteRepositoryFake();
    const useCase = new CreateNote(repo);

    const note = await useCase.execute({
      ...baseInput,
      doc: { type: 'doc', content: [] },
    });

    expect(note.plainText).toBe('');
  });

  it('calls repo.save exactly once with the assembled note', async () => {
    const repo = new NoteRepositoryFake();
    const useCase = new CreateNote(repo);

    await useCase.execute(baseInput);

    expect(repo.saved).toHaveLength(1);
    expect(repo.saved[0].userId).toBe('user-1');
    expect(repo.saved[0].status).toBe('ACTIVE');
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
