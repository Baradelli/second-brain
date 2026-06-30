import { beforeEach, describe, expect, it } from 'vitest';

import { NoteNotFoundError } from '../../domain/errors.js';
import type { Note } from '../../domain/note.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { UnarchiveNote } from '../unarchive-note.js';

const USER = 'user-1';

function makeNote(overrides?: Partial<Note>): Note {
  return {
    id: 'n1',
    userId: USER,
    type: 'NOTE',
    scope: 'DAY',
    date: new Date('2026-06-02T00:00:00.000Z'),
    doc: { type: 'doc', content: [] },
    plainText: '',
    status: 'ARCHIVED',
    archivedAt: new Date('2026-06-03T00:00:00.000Z'),
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    ...overrides,
  };
}

describe('UnarchiveNote', () => {
  let repo: NoteRepositoryFake;
  let useCase: UnarchiveNote;

  beforeEach(() => {
    repo = new NoteRepositoryFake();
    useCase = new UnarchiveNote(repo);
  });

  it('restaura a nota (ACTIVE + archivedAt nulo)', async () => {
    await repo.save(makeNote());

    const result = await useCase.execute({ id: 'n1', userId: USER });

    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt ?? null).toBeNull();
  });

  it('é idempotente para uma nota já ativa', async () => {
    await repo.save(makeNote({ status: 'ACTIVE', archivedAt: undefined }));

    const result = await useCase.execute({ id: 'n1', userId: USER });

    expect(result.status).toBe('ACTIVE');
  });

  it('não restaura nota de outro usuário', async () => {
    await repo.save(makeNote({ userId: 'other' }));

    await expect(useCase.execute({ id: 'n1', userId: USER })).rejects.toThrow(
      NoteNotFoundError,
    );
  });
});
