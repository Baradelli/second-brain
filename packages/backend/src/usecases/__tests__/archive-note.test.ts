import { beforeEach, describe, expect, it } from 'vitest';

import { NoteNotFoundError } from '../../domain/errors.js';
import type { Note } from '../../domain/note.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { ArchiveNote } from '../archive-note.js';

function makeNote(overrides?: Partial<Note>): Note {
  return {
    id: 'n1',
    userId: 'user-1',
    type: 'NOTE',
    scope: 'DAY',
    date: new Date('2026-06-02T00:00:00.000Z'),
    doc: { type: 'doc', content: [] },
    plainText: '',
    status: 'ACTIVE',
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    ...overrides,
  };
}

describe('ArchiveNote', () => {
  let repo: NoteRepositoryFake;
  let useCase: ArchiveNote;

  beforeEach(() => {
    repo = new NoteRepositoryFake();
    useCase = new ArchiveNote(repo);
  });

  it('arquiva a nota (status ARCHIVED + archivedAt)', async () => {
    await repo.save(makeNote({ id: 'n1', status: 'ACTIVE' }));

    const result = await useCase.execute({ id: 'n1' });

    expect(result.status).toBe('ARCHIVED');
    expect(result.archivedAt).toBeInstanceOf(Date);

    // sai das listagens ACTIVE
    const active = await repo.find({ userId: 'user-1', status: 'ACTIVE' });
    expect(active.map((n) => n.id)).not.toContain('n1');
  });

  it('throws NoteNotFoundError para id inexistente', async () => {
    await expect(useCase.execute({ id: 'ghost' })).rejects.toThrow(
      NoteNotFoundError,
    );
  });
});
