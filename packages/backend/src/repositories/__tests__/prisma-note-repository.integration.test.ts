import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Note } from '../../domain/note.js';
import { PrismaNoteRepository } from '../prisma-note-repository.js';
import { clearNotes, prisma, setupTestUser, TEST_USER_ID } from './_db.js';

const repo = new PrismaNoteRepository(prisma);

function makeNote(overrides?: Partial<Note>): Note {
  return {
    id: 'note-1',
    userId: TEST_USER_ID,
    type: 'NOTE',
    scope: 'DAY',
    date: new Date('2026-06-02T00:00:00.000Z'),
    doc: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
      ],
    },
    plainText: 'hello',
    status: 'ACTIVE',
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    ...overrides,
  };
}

beforeAll(async () => {
  await setupTestUser();
});

beforeEach(async () => {
  await clearNotes();
});

afterAll(async () => {
  await clearNotes();
  await prisma.$disconnect();
});

describe('PrismaNoteRepository', () => {
  it('save + byId round-trip preserves all fields including doc JSON', async () => {
    const note = makeNote();
    await repo.save(note);
    const found = await repo.byId('note-1');

    expect(found).not.toBeNull();
    expect(found!.id).toBe('note-1');
    expect(found!.userId).toBe(TEST_USER_ID);
    expect(found!.type).toBe('NOTE');
    expect(found!.scope).toBe('DAY');
    expect(found!.plainText).toBe('hello');
    expect(found!.status).toBe('ACTIVE');
    expect(found!.doc).toEqual(note.doc);
  });

  it('byId returns null for unknown id', async () => {
    const found = await repo.byId('ghost');
    expect(found).toBeNull();
  });

  it('find filters by userId and type', async () => {
    await repo.save(makeNote({ id: 'n1', type: 'NOTE' }));
    await repo.save(makeNote({ id: 'n2', type: 'DEVOTIONAL' }));

    const result = await repo.find({ userId: TEST_USER_ID, type: 'NOTE' });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('n1');
  });

  it('find filters by date range — both borders inclusive', async () => {
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
      userId: TEST_USER_ID,
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

    const active = await repo.find({ userId: TEST_USER_ID, status: 'ACTIVE' });
    const archived = await repo.find({
      userId: TEST_USER_ID,
      status: 'ARCHIVED',
    });

    expect(active.map((n) => n.id)).toContain('active');
    expect(active.map((n) => n.id)).not.toContain('archived');
    expect(archived.map((n) => n.id)).toContain('archived');
  });

  it('update applies patch without overwriting other fields', async () => {
    await repo.save(
      makeNote({ id: 'n1', plainText: 'original', title: undefined }),
    );

    const updated = await repo.update('n1', {
      plainText: 'patched',
      title: 'New title',
    });

    expect(updated.plainText).toBe('patched');
    expect(updated.title).toBe('New title');
    expect(updated.userId).toBe(TEST_USER_ID);
    expect(updated.type).toBe('NOTE');

    const persisted = await repo.byId('n1');
    expect(persisted?.plainText).toBe('patched');
  });

  it('update throws when note does not exist', async () => {
    await expect(repo.update('ghost', { plainText: 'x' })).rejects.toThrow();
  });

  it('find filters by resourceId', async () => {
    const resource = await prisma.resource.create({
      data: {
        id: 'res-notes',
        userId: TEST_USER_ID,
        title: 'DDD',
        type: 'book',
      },
    });
    try {
      await repo.save(makeNote({ id: 'linked', resourceId: resource.id }));
      await repo.save(makeNote({ id: 'free' }));

      const result = await repo.find({
        userId: TEST_USER_ID,
        resourceId: resource.id,
      });
      expect(result.map((n) => n.id)).toEqual(['linked']);
    } finally {
      await prisma.note.deleteMany({ where: { userId: TEST_USER_ID } });
      await prisma.resource.deleteMany({ where: { userId: TEST_USER_ID } });
    }
  });
});
