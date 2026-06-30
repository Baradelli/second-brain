import { beforeEach, describe, expect, it } from 'vitest';

import type { Capture } from '../../domain/capture.js';
import { CaptureNotFoundError } from '../../domain/errors.js';
import { CaptureRepositoryFake } from '../_fakes/capture-repository-fake.js';
import { UnarchiveCapture } from '../unarchive-capture.js';

const USER = 'user-1';

function makeCapture(overrides?: Partial<Capture>): Capture {
  return {
    id: 'c1',
    userId: USER,
    text: 'ideia',
    status: 'ARCHIVED',
    reviewAt: null,
    processedAt: null,
    promotedToType: null,
    promotedToId: null,
    archivedAt: new Date('2026-06-03T00:00:00.000Z'),
    archiveReason: 'limpeza',
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    ...overrides,
  };
}

describe('UnarchiveCapture', () => {
  let repo: CaptureRepositoryFake;
  let useCase: UnarchiveCapture;

  beforeEach(() => {
    repo = new CaptureRepositoryFake();
    useCase = new UnarchiveCapture(repo);
  });

  it('restaura a captura para PENDING e limpa arquivamento', async () => {
    await repo.save(makeCapture());

    const result = await useCase.execute({ id: 'c1', userId: USER });

    expect(result.status).toBe('PENDING');
    expect(result.archivedAt).toBeNull();
    expect(result.archiveReason).toBeNull();
  });

  it('não restaura captura de outro usuário', async () => {
    await repo.save(makeCapture({ userId: 'other' }));

    await expect(useCase.execute({ id: 'c1', userId: USER })).rejects.toThrow(
      CaptureNotFoundError,
    );
  });
});
