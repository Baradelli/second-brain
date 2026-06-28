import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaNoteLinkRepository } from '../prisma-note-link-repository.js';
import { prisma, setupTestUser, TEST_USER_ID } from './_db.js';

const repo = new PrismaNoteLinkRepository(prisma);

async function makeNote(id: string) {
  await prisma.note.create({
    data: {
      id,
      userId: TEST_USER_ID,
      type: 'NOTE',
      date: new Date('2026-06-20T00:00:00.000Z'),
      doc: { type: 'doc', content: [] },
    },
  });
}

async function clearAll() {
  await prisma.noteLink.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.note.deleteMany({ where: { userId: TEST_USER_ID } });
}

beforeAll(async () => {
  await setupTestUser();
});

beforeEach(async () => {
  await clearAll();
  await makeNote('n1');
  await makeNote('n2');
  await makeNote('n3');
});

afterAll(async () => {
  await clearAll();
  await prisma.$disconnect();
});

describe('PrismaNoteLinkRepository', () => {
  it('replaceOutgoing inserts the outgoing set; listGraphEdges returns them', async () => {
    await repo.replaceOutgoing(TEST_USER_ID, 'n1', ['n2', 'n3']);

    const edges = await repo.listGraphEdges(TEST_USER_ID);
    expect(edges.sort((a, b) => a.toNoteId.localeCompare(b.toNoteId))).toEqual([
      { fromNoteId: 'n1', toNoteId: 'n2' },
      { fromNoteId: 'n1', toNoteId: 'n3' },
    ]);
  });

  it('replaceOutgoing replaces (not appends) the previous set', async () => {
    await repo.replaceOutgoing(TEST_USER_ID, 'n1', ['n2']);
    await repo.replaceOutgoing(TEST_USER_ID, 'n1', ['n3']);

    const edges = await repo.listGraphEdges(TEST_USER_ID);
    expect(edges).toEqual([{ fromNoteId: 'n1', toNoteId: 'n3' }]);
  });

  it('replaceOutgoing with [] clears the outgoing links', async () => {
    await repo.replaceOutgoing(TEST_USER_ID, 'n1', ['n2', 'n3']);
    await repo.replaceOutgoing(TEST_USER_ID, 'n1', []);

    expect(await repo.listGraphEdges(TEST_USER_ID)).toEqual([]);
  });

  it('listBacklinks returns links pointing TO the given note', async () => {
    await repo.replaceOutgoing(TEST_USER_ID, 'n1', ['n3']);
    await repo.replaceOutgoing(TEST_USER_ID, 'n2', ['n3']);

    const backlinks = await repo.listBacklinks(TEST_USER_ID, 'n3');
    expect(backlinks.map((l) => l.fromNoteId).sort()).toEqual(['n1', 'n2']);
    expect(backlinks.every((l) => l.toNoteId === 'n3')).toBe(true);
  });

  it('replaceOutgoing is idempotent under the (from,to) unique constraint', async () => {
    await repo.replaceOutgoing(TEST_USER_ID, 'n1', ['n2']);
    await repo.replaceOutgoing(TEST_USER_ID, 'n1', ['n2']);

    const edges = await repo.listGraphEdges(TEST_USER_ID);
    expect(edges).toEqual([{ fromNoteId: 'n1', toNoteId: 'n2' }]);
  });

  it('listGraphEdges scopes by userId', async () => {
    await repo.replaceOutgoing(TEST_USER_ID, 'n1', ['n2']);
    expect(await repo.listGraphEdges('someone-else')).toEqual([]);
  });
});
