import { beforeEach, describe, expect, it } from 'vitest';

import {
  CaptureAlreadyProcessedError,
  CaptureNotFoundError,
} from '../../domain/errors.js';
import { CaptureRepositoryFake } from '../_fakes/capture-repository-fake.js';
import { EditCapture } from '../edit-capture.js';

const OWNER = 'user-1';

const BASE = {
  id: 'cap-1',
  userId: OWNER,
  text: 'ideia original',
  url: undefined,
  status: 'PENDING' as const,
  reviewAt: new Date('2026-06-10T12:00:00.000Z'),
  processedAt: null,
  promotedToType: null,
  promotedToId: null,
  archivedAt: null,
  archiveReason: null,
  labelIds: ['label-a'],
  createdAt: new Date('2026-06-01T10:00:00.000Z'),
};

describe('EditCapture', () => {
  let repo: CaptureRepositoryFake;
  let usecase: EditCapture;

  beforeEach(async () => {
    repo = new CaptureRepositoryFake();
    usecase = new EditCapture(repo);
    await repo.save({ ...BASE });
  });

  it('edita o texto de uma captura PENDING', async () => {
    const result = await usecase.execute({
      id: 'cap-1',
      userId: OWNER,
      text: 'ideia corrigida',
    });

    expect(result.text).toBe('ideia corrigida');
    expect(result.status).toBe('PENDING');
  });

  it('edita url e labels; campos não enviados ficam intactos', async () => {
    const result = await usecase.execute({
      id: 'cap-1',
      userId: OWNER,
      url: 'https://exemplo.com',
      labelIds: ['label-b'],
    });

    expect(result.text).toBe('ideia original');
    expect(result.url).toBe('https://exemplo.com');
    expect(result.labelIds).toEqual(['label-b']);
    expect(result.reviewAt).toEqual(BASE.reviewAt);
  });

  it('intruso recebe NotFound (não vaza existência)', async () => {
    await expect(
      usecase.execute({ id: 'cap-1', userId: 'intruder', text: 'hack' }),
    ).rejects.toThrow(CaptureNotFoundError);
  });

  it('id inexistente → NotFound', async () => {
    await expect(
      usecase.execute({ id: 'ghost', userId: OWNER, text: 'x' }),
    ).rejects.toThrow(CaptureNotFoundError);
  });

  it('captura PROCESSED não se edita (histórico de promoção)', async () => {
    await repo.save({ ...BASE, id: 'cap-2', status: 'PROCESSED' });
    await expect(
      usecase.execute({ id: 'cap-2', userId: OWNER, text: 'x' }),
    ).rejects.toThrow(CaptureAlreadyProcessedError);
  });

  it('captura ARCHIVED não se edita', async () => {
    await repo.save({ ...BASE, id: 'cap-3', status: 'ARCHIVED' });
    await expect(
      usecase.execute({ id: 'cap-3', userId: OWNER, text: 'x' }),
    ).rejects.toThrow(CaptureAlreadyProcessedError);
  });
});
