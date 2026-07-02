import { beforeEach, describe, expect, it } from 'vitest';

import { CaptureNotFoundError } from '../../domain/errors.js';
import { CaptureRepositoryFake } from '../_fakes/capture-repository-fake.js';
import { ArchiveCapture } from '../archive-capture.js';

const BASE_CAPTURE = {
  id: 'cap-1',
  userId: 'user-1',
  text: 'ideia para testar',
  url: undefined,
  status: 'PENDING' as const,
  reviewAt: new Date('2026-06-10T12:00:00.000Z'),
  processedAt: null,
  promotedToType: null,
  promotedToId: null,
  archivedAt: null,
  archiveReason: null,
  createdAt: new Date('2026-06-01T10:00:00.000Z'),
};

describe('ArchiveCapture', () => {
  let repo: CaptureRepositoryFake;
  let usecase: ArchiveCapture;

  beforeEach(async () => {
    repo = new CaptureRepositoryFake();
    usecase = new ArchiveCapture(repo);
    await repo.save({ ...BASE_CAPTURE });
  });

  it('arquiva uma captura PENDING: status ARCHIVED e archivedAt setado', async () => {
    const result = await usecase.execute({ id: 'cap-1', userId: 'user-1' });

    expect(result.status).toBe('ARCHIVED');
    expect(result.archivedAt).toBeInstanceOf(Date);
    expect(result.archiveReason).toBeNull();
  });

  it('grava archiveReason quando enviado', async () => {
    const result = await usecase.execute({
      id: 'cap-1',
      userId: 'user-1',
      reason: 'já fiz isso',
    });

    expect(result.status).toBe('ARCHIVED');
    expect(result.archiveReason).toBe('já fiz isso');
  });

  it('lança CaptureNotFoundError para id inexistente', async () => {
    await expect(usecase.execute({ id: 'nao-existe', userId: 'user-1' })).rejects.toThrow(
      CaptureNotFoundError,
    );
  });

  it('não aparece em listPendingCaptures após arquivar; aparece em listArchived', async () => {
    await usecase.execute({ id: 'cap-1', userId: 'user-1' });

    const pending = await repo.find({ userId: 'user-1', status: 'PENDING' });
    const archived = await repo.find({ userId: 'user-1', status: 'ARCHIVED' });

    expect(pending).toHaveLength(0);
    expect(archived).toHaveLength(1);
    expect(archived[0]?.id).toBe('cap-1');
  });
});
