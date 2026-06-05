import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Resource } from '../../domain/resource.js';
import { PrismaResourceRepository } from '../prisma-resource-repository.js';
import { prisma, setupTestUser, TEST_USER_ID } from './_db.js';

const repo = new PrismaResourceRepository(prisma);

function makeResource(overrides?: Partial<Resource>): Resource {
  return {
    id: 'res-1',
    userId: TEST_USER_ID,
    title: 'Domain-Driven Design',
    type: 'book',
    url: null,
    author: null,
    description: null,
    stage: 'backlog',
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-04T10:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

async function clearAll() {
  await prisma.resource.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.label.deleteMany({ where: { userId: TEST_USER_ID } });
}

async function makeLabel(id: string, name: string) {
  await prisma.label.create({
    data: { id, userId: TEST_USER_ID, name },
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

describe('PrismaResourceRepository', () => {
  it('save + byId round-trip preserves all fields including null optionals', async () => {
    await repo.save(makeResource());
    const found = await repo.byId('res-1');

    expect(found).not.toBeNull();
    expect(found!.id).toBe('res-1');
    expect(found!.userId).toBe(TEST_USER_ID);
    expect(found!.title).toBe('Domain-Driven Design');
    expect(found!.type).toBe('book');
    expect(found!.stage).toBe('backlog');
    expect(found!.status).toBe('ACTIVE');
    expect(found!.url).toBeNull();
    expect(found!.author).toBeNull();
    expect(found!.description).toBeNull();
    expect(found!.archivedAt).toBeNull();
    expect(found!.labelIds).toEqual([]);
  });

  it('byId returns null for unknown id', async () => {
    expect(await repo.byId('ghost')).toBeNull();
  });

  it('save with labelIds connects labels; byId returns the ids', async () => {
    await makeLabel('l1', 'Tech');
    await makeLabel('l2', 'Arch');

    await repo.save(makeResource({ labelIds: ['l1', 'l2'] }));
    const found = await repo.byId('res-1');

    expect(found!.labelIds.sort()).toEqual(['l1', 'l2']);
  });

  it('find filters by userId and stage', async () => {
    await repo.save(makeResource({ id: 'a', stage: 'backlog' }));
    await repo.save(makeResource({ id: 'b', stage: 'in_progress' }));

    const result = await repo.find({
      userId: TEST_USER_ID,
      stage: 'in_progress',
    });

    expect(result.map((r) => r.id)).toEqual(['b']);
  });

  it('find filters by status', async () => {
    await repo.save(makeResource({ id: 'active', status: 'ACTIVE' }));
    await repo.save(makeResource({ id: 'archived', status: 'ARCHIVED' }));

    const active = await repo.find({ userId: TEST_USER_ID, status: 'ACTIVE' });
    expect(active.map((r) => r.id)).toContain('active');
    expect(active.map((r) => r.id)).not.toContain('archived');
  });

  it('find filters by labelId', async () => {
    await makeLabel('l1', 'Tech');
    await makeLabel('l2', 'Arch');
    await repo.save(makeResource({ id: 'with', labelIds: ['l1'] }));
    await repo.save(makeResource({ id: 'without', labelIds: ['l2'] }));

    const result = await repo.find({ userId: TEST_USER_ID, labelId: 'l1' });
    expect(result.map((r) => r.id)).toEqual(['with']);
  });

  it('update applies partial patch without overwriting other fields', async () => {
    await repo.save(makeResource({ id: 'res-1', author: 'Evans' }));

    const updated = await repo.update('res-1', {
      stage: 'done',
      description: 'Finished',
    });

    expect(updated.stage).toBe('done');
    expect(updated.description).toBe('Finished');
    expect(updated.author).toBe('Evans');
    expect(updated.title).toBe('Domain-Driven Design');

    const persisted = await repo.byId('res-1');
    expect(persisted?.stage).toBe('done');
  });

  it('update with labelIds replaces the set; absent keeps current', async () => {
    await makeLabel('l1', 'A');
    await makeLabel('l2', 'B');
    await makeLabel('l3', 'C');
    await repo.save(makeResource({ id: 'res-1', labelIds: ['l1', 'l2'] }));

    const replaced = await repo.update('res-1', { labelIds: ['l3'] });
    expect(replaced.labelIds).toEqual(['l3']);

    const kept = await repo.update('res-1', { title: 'New' });
    expect(kept.labelIds).toEqual(['l3']);
  });

  it('update throws when resource does not exist', async () => {
    await expect(repo.update('ghost', { title: 'x' })).rejects.toThrow();
  });
});
