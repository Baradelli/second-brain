import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Publication } from '../../domain/publication.js';
import { PrismaPublicationRepository } from '../prisma-publication-repository.js';
import { prisma, setupTestUser, TEST_USER_ID } from './_db.js';

const repo = new PrismaPublicationRepository(prisma);

function makePublication(overrides?: Partial<Publication>): Publication {
  return {
    id: 'pub-1',
    userId: TEST_USER_ID,
    sourceType: 'study_item',
    sourceId: 'si-1',
    format: 'blog',
    stage: 'idea',
    title: 'A ressurreição em Paulo',
    noteId: null,
    publishedAt: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-20T10:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

async function clearAll() {
  await prisma.publication.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.note.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.label.deleteMany({ where: { userId: TEST_USER_ID } });
}

async function makeLabel(id: string, name: string) {
  await prisma.label.create({ data: { id, userId: TEST_USER_ID, name } });
}

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

beforeAll(async () => {
  await setupTestUser();
});

beforeEach(async () => {
  await clearAll();
});

afterAll(async () => {
  await clearAll();
  await prisma.$disconnect();
});

describe('PrismaPublicationRepository', () => {
  it('save + byId round-trip preserves all fields including null optionals', async () => {
    await repo.save(makePublication());
    const found = await repo.byId('pub-1');

    expect(found).not.toBeNull();
    expect(found!.id).toBe('pub-1');
    expect(found!.userId).toBe(TEST_USER_ID);
    expect(found!.sourceType).toBe('study_item');
    expect(found!.sourceId).toBe('si-1');
    expect(found!.format).toBe('blog');
    expect(found!.stage).toBe('idea');
    expect(found!.title).toBe('A ressurreição em Paulo');
    expect(found!.noteId).toBeNull();
    expect(found!.publishedAt).toBeNull();
    expect(found!.status).toBe('ACTIVE');
    expect(found!.archivedAt).toBeNull();
    expect(found!.labelIds).toEqual([]);
  });

  it('byId returns null for unknown id', async () => {
    expect(await repo.byId('ghost')).toBeNull();
  });

  it('save with noteId links the draft Note; byId returns it', async () => {
    await makeNote('note-1');
    await repo.save(makePublication({ noteId: 'note-1' }));
    const found = await repo.byId('pub-1');
    expect(found!.noteId).toBe('note-1');
  });

  it('save with labelIds connects labels; byId returns the ids', async () => {
    await makeLabel('l1', 'Tech');
    await makeLabel('l2', 'Arch');

    await repo.save(makePublication({ labelIds: ['l1', 'l2'] }));
    const found = await repo.byId('pub-1');

    expect(found!.labelIds.sort()).toEqual(['l1', 'l2']);
  });

  it('find filters by userId and stage', async () => {
    await repo.save(makePublication({ id: 'a', stage: 'idea' }));
    await repo.save(makePublication({ id: 'b', stage: 'published' }));

    const result = await repo.find({
      userId: TEST_USER_ID,
      stage: 'published',
    });

    expect(result.map((p) => p.id)).toEqual(['b']);
  });

  it('find filters by format', async () => {
    await repo.save(makePublication({ id: 'blog', format: 'blog' }));
    await repo.save(makePublication({ id: 'video', format: 'video' }));

    const result = await repo.find({ userId: TEST_USER_ID, format: 'video' });
    expect(result.map((p) => p.id)).toEqual(['video']);
  });

  it('find filters by status', async () => {
    await repo.save(makePublication({ id: 'active', status: 'ACTIVE' }));
    await repo.save(makePublication({ id: 'archived', status: 'ARCHIVED' }));

    const active = await repo.find({ userId: TEST_USER_ID, status: 'ACTIVE' });
    expect(active.map((p) => p.id)).toContain('active');
    expect(active.map((p) => p.id)).not.toContain('archived');
  });

  it('update applies partial patch without overwriting other fields', async () => {
    await repo.save(makePublication({ id: 'pub-1', title: 'Original' }));

    const updated = await repo.update('pub-1', {
      stage: 'published',
      publishedAt: new Date('2026-06-27T12:00:00.000Z'),
    });

    expect(updated.stage).toBe('published');
    expect(updated.publishedAt?.toISOString()).toBe('2026-06-27T12:00:00.000Z');
    expect(updated.title).toBe('Original');

    const persisted = await repo.byId('pub-1');
    expect(persisted?.stage).toBe('published');
  });

  it('update with labelIds replaces the set; absent keeps current', async () => {
    await makeLabel('l1', 'A');
    await makeLabel('l2', 'B');
    await makeLabel('l3', 'C');
    await repo.save(makePublication({ id: 'pub-1', labelIds: ['l1', 'l2'] }));

    const replaced = await repo.update('pub-1', { labelIds: ['l3'] });
    expect(replaced.labelIds).toEqual(['l3']);

    const kept = await repo.update('pub-1', { title: 'New' });
    expect(kept.labelIds).toEqual(['l3']);
  });

  it('update throws when publication does not exist', async () => {
    await expect(repo.update('ghost', { title: 'x' })).rejects.toThrow();
  });
});
