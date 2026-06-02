import { beforeEach,describe, expect, it } from 'vitest';

import type { Capture } from '../../../domain/capture.js';
import { CaptureRepositoryFake } from '../capture-repository-fake.js';

function makeCapture(overrides?: Partial<Capture>): Capture {
  return {
    id: 'cap-1',
    userId: 'user-1',
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

describe('CaptureRepositoryFake', () => {
  let repo: CaptureRepositoryFake;

  beforeEach(() => {
    repo = new CaptureRepositoryFake();
  });

  it('save + byId round-trip', async () => {
    const capture = makeCapture();
    await repo.save(capture);
    const found = await repo.byId('cap-1');
    expect(found).toEqual(capture);
  });

  it('byId returns null for unknown id', async () => {
    expect(await repo.byId('ghost')).toBeNull();
  });

  it('find by status separates PENDING / PROCESSED / ARCHIVED', async () => {
    await repo.save(makeCapture({ id: 'c1', status: 'PENDING' }));
    await repo.save(makeCapture({ id: 'c2', status: 'PROCESSED' }));
    await repo.save(makeCapture({ id: 'c3', status: 'ARCHIVED' }));

    const pending  = await repo.find({ userId: 'user-1', status: 'PENDING' });
    const archived = await repo.find({ userId: 'user-1', status: 'ARCHIVED' });

    expect(pending.map(c => c.id)).toEqual(['c1']);
    expect(archived.map(c => c.id)).toEqual(['c3']);
  });

  it('find with reviewUntil returns only captures where reviewAt <= reviewUntil', async () => {
    const d = (s: string) => new Date(s);
    await repo.save(makeCapture({ id: 'due',    reviewAt: d('2026-06-07T03:00:00.000Z') }));
    await repo.save(makeCapture({ id: 'today',  reviewAt: d('2026-06-09T03:00:00.000Z') }));
    await repo.save(makeCapture({ id: 'future', reviewAt: d('2026-06-14T03:00:00.000Z') }));
    await repo.save(makeCapture({ id: 'no-date', reviewAt: null }));

    const result = await repo.find({
      userId: 'user-1',
      reviewUntil: d('2026-06-09T03:00:00.000Z'),
    });

    const ids = result.map(c => c.id);
    expect(ids).toContain('due');
    expect(ids).toContain('today');
    expect(ids).not.toContain('future');
    expect(ids).not.toContain('no-date');
  });

  it('update applies patch and persists; unlisted fields unchanged', async () => {
    await repo.save(makeCapture({ id: 'c1', text: 'original' }));

    const updated = await repo.update('c1', { text: 'updated', status: 'PROCESSED' });

    expect(updated.text).toBe('updated');
    expect(updated.status).toBe('PROCESSED');
    expect(updated.userId).toBe('user-1');

    const persisted = await repo.byId('c1');
    expect(persisted?.text).toBe('updated');
  });

  it('update throws when capture does not exist', async () => {
    await expect(repo.update('ghost', { text: 'x' })).rejects.toThrow();
  });

  it('labelIds are stored and retrieved', async () => {
    await repo.save(makeCapture({ id: 'c1', labelIds: ['lbl-1', 'lbl-2'] }));
    const found = await repo.byId('c1');
    expect(found?.labelIds).toEqual(['lbl-1', 'lbl-2']);
  });
});
