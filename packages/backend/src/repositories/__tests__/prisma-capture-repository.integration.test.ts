import { PrismaClient } from '@prisma/client';
import { afterAll,beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Capture } from '../../domain/capture.js';
import { PrismaCaptureRepository } from '../prisma-capture-repository.js';

const prisma = new PrismaClient();
const USER_ID = 'test-user-capture';
const LABEL_ID = 'test-label-capture';

const repo = new PrismaCaptureRepository(prisma);

function makeCapture(overrides?: Partial<Capture>): Capture {
  return {
    id: 'cap-1',
    userId: USER_ID,
    text: 'ideia',
    status: 'PENDING',
    reviewAt: new Date('2026-06-07T03:00:00.000Z'),
    processedAt: null,
    promotedToType: null,
    promotedToId: null,
    archivedAt: null,
    archiveReason: null,
    createdAt: new Date('2026-06-02T12:00:00.000Z'),
    ...overrides,
  };
}

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: 'capture-test@cerebro.local', name: 'Capture Test' },
  });
  await prisma.label.upsert({
    where: { id: LABEL_ID },
    update: {},
    create: { id: LABEL_ID, userId: USER_ID, name: 'Test Label' },
  });
});

beforeEach(async () => {
  await prisma.capture.deleteMany({ where: { userId: USER_ID } });
});

afterAll(async () => {
  await prisma.capture.deleteMany({ where: { userId: USER_ID } });
  await prisma.label.deleteMany({ where: { id: LABEL_ID } });
  await prisma.$disconnect();
});

describe('PrismaCaptureRepository', () => {
  it('save + byId round-trip preserves all fields', async () => {
    await repo.save(makeCapture());
    const found = await repo.byId('cap-1');

    expect(found).not.toBeNull();
    expect(found!.id).toBe('cap-1');
    expect(found!.text).toBe('ideia');
    expect(found!.status).toBe('PENDING');
    expect(found!.reviewAt).toEqual(new Date('2026-06-07T03:00:00.000Z'));
    expect(found!.processedAt).toBeNull();
  });

  it('byId returns null for unknown id', async () => {
    expect(await repo.byId('ghost')).toBeNull();
  });

  it('find by status separates PENDING / ARCHIVED', async () => {
    await repo.save(makeCapture({ id: 'c1', status: 'PENDING' }));
    await repo.save(makeCapture({ id: 'c2', status: 'ARCHIVED' }));

    const pending  = await repo.find({ userId: USER_ID, status: 'PENDING' });
    const archived = await repo.find({ userId: USER_ID, status: 'ARCHIVED' });

    expect(pending.map(c => c.id)).toContain('c1');
    expect(pending.map(c => c.id)).not.toContain('c2');
    expect(archived.map(c => c.id)).toContain('c2');
  });

  it('find with reviewUntil respects border (inclusive)', async () => {
    const d = (s: string) => new Date(s);
    await repo.save(makeCapture({ id: 'due',    reviewAt: d('2026-06-07T03:00:00.000Z') }));
    await repo.save(makeCapture({ id: 'border', reviewAt: d('2026-06-09T03:00:00.000Z') }));
    await repo.save(makeCapture({ id: 'future', reviewAt: d('2026-06-14T03:00:00.000Z') }));

    const result = await repo.find({
      userId: USER_ID,
      reviewUntil: d('2026-06-09T03:00:00.000Z'),
    });

    const ids = result.map(c => c.id);
    expect(ids).toContain('due');
    expect(ids).toContain('border');
    expect(ids).not.toContain('future');
  });

  it('update applies patch without overwriting other fields', async () => {
    await repo.save(makeCapture({ id: 'c1', text: 'original' }));

    const updated = await repo.update('c1', { text: 'updated', status: 'PROCESSED' });

    expect(updated.text).toBe('updated');
    expect(updated.status).toBe('PROCESSED');
    expect(updated.userId).toBe(USER_ID);

    const persisted = await repo.byId('c1');
    expect(persisted?.text).toBe('updated');
  });

  it('update throws when capture does not exist', async () => {
    await expect(repo.update('ghost', { text: 'x' })).rejects.toThrow();
  });

  it('labelIds are persisted and returned', async () => {
    await repo.save(makeCapture({ id: 'c1', labelIds: [LABEL_ID] }));

    const found = await repo.byId('c1');
    expect(found?.labelIds).toEqual([LABEL_ID]);

    const listed = await repo.find({ userId: USER_ID });
    expect(listed[0]?.labelIds).toEqual([LABEL_ID]);
  });
});
