import { beforeEach, describe, expect, it } from 'vitest';

import type { Note } from '../../../domain/note.js';
import { NoteRepositoryFake } from '../note-repository-fake.js';

function makeNote(overrides?: Partial<Note>): Note {
  return {
    id: 'note-1',
    userId: 'user-1',
    type: 'NOTE',
    scope: 'DAY',
    date: new Date('2026-06-02T00:00:00.000Z'),
    doc: {},
    plainText: 'hello',
    status: 'ACTIVE',
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    ...overrides,
  };
}

describe('NoteRepositoryFake', () => {
  let repo: NoteRepositoryFake;

  beforeEach(() => {
    repo = new NoteRepositoryFake();
  });

  it('save and byId return the same note', async () => {
    const note = makeNote();
    await repo.save(note);
    const found = await repo.byId('note-1');
    expect(found).toEqual(note);
  });

  it('byId returns null for unknown id', async () => {
    const found = await repo.byId('ghost');
    expect(found).toBeNull();
  });

  it('find filters by userId and type', async () => {
    await repo.save(makeNote({ id: 'n1', userId: 'user-1', type: 'NOTE' }));
    await repo.save(
      makeNote({ id: 'n2', userId: 'user-1', type: 'DEVOTIONAL' }),
    );
    await repo.save(makeNote({ id: 'n3', userId: 'user-2', type: 'NOTE' }));

    const result = await repo.find({ userId: 'user-1', type: 'NOTE' });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('n1');
  });

  it('find filters by date range — includes borders, excludes outside', async () => {
    const d = (iso: string) => new Date(iso);
    await repo.save(
      makeNote({ id: 'before', date: d('2026-06-01T00:00:00.000Z') }),
    );
    await repo.save(
      makeNote({ id: 'from', date: d('2026-06-02T00:00:00.000Z') }),
    );
    await repo.save(
      makeNote({ id: 'mid', date: d('2026-06-03T00:00:00.000Z') }),
    );
    await repo.save(
      makeNote({ id: 'to', date: d('2026-06-04T00:00:00.000Z') }),
    );
    await repo.save(
      makeNote({ id: 'after', date: d('2026-06-05T00:00:00.000Z') }),
    );

    const result = await repo.find({
      userId: 'user-1',
      from: d('2026-06-02T00:00:00.000Z'),
      to: d('2026-06-04T00:00:00.000Z'),
    });

    const ids = result.map((n) => n.id);
    expect(ids).toContain('from');
    expect(ids).toContain('mid');
    expect(ids).toContain('to');
    expect(ids).not.toContain('before');
    expect(ids).not.toContain('after');
  });

  it('find filters by status', async () => {
    await repo.save(makeNote({ id: 'active', status: 'ACTIVE' }));
    await repo.save(makeNote({ id: 'archived', status: 'ARCHIVED' }));

    const active = await repo.find({ userId: 'user-1', status: 'ACTIVE' });
    const archived = await repo.find({ userId: 'user-1', status: 'ARCHIVED' });

    expect(active.map((n) => n.id)).toEqual(['active']);
    expect(archived.map((n) => n.id)).toEqual(['archived']);
  });

  it('update applies patch and persists', async () => {
    await repo.save(makeNote({ id: 'n1', plainText: 'original' }));

    const updated = await repo.update('n1', {
      plainText: 'patched',
      title: 'New title',
    });

    expect(updated.plainText).toBe('patched');
    expect(updated.title).toBe('New title');
    expect(updated.userId).toBe('user-1'); // outros campos preservados

    const persisted = await repo.byId('n1');
    expect(persisted?.plainText).toBe('patched');
  });

  it('update throws when note does not exist', async () => {
    await expect(repo.update('ghost', { plainText: 'x' })).rejects.toThrow();
  });
});
