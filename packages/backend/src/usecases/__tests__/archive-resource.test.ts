import { beforeEach, describe, expect, it } from 'vitest';

import { ResourceNotFoundError } from '../../domain/errors.js';
import type { Resource } from '../../domain/resource.js';
import { ResourceRepositoryFake } from '../_fakes/resource-repository-fake.js';
import { ArchiveResource } from '../archive-resource.js';

const USER = 'user-1';

function makeResource(overrides?: Partial<Resource>): Resource {
  return {
    id: 'r1',
    userId: USER,
    title: 'Livro',
    type: 'book',
    url: null,
    author: null,
    description: null,
    stage: 'backlog',
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

describe('ArchiveResource', () => {
  let repo: ResourceRepositoryFake;
  let useCase: ArchiveResource;

  beforeEach(() => {
    repo = new ResourceRepositoryFake();
    useCase = new ArchiveResource(repo);
  });

  it('arquiva o recurso (ARCHIVED + archivedAt)', async () => {
    await repo.save(makeResource());

    const result = await useCase.execute({ id: 'r1', userId: USER });

    expect(result.status).toBe('ARCHIVED');
    expect(result.archivedAt).toBeInstanceOf(Date);
  });

  it('é idempotente: já arquivado mantém o archivedAt original', async () => {
    const archivedAt = new Date('2026-06-01T00:00:00.000Z');
    await repo.save(makeResource({ status: 'ARCHIVED', archivedAt }));

    const result = await useCase.execute({ id: 'r1', userId: USER });

    expect(result.archivedAt).toEqual(archivedAt);
  });

  it('não arquiva recurso de outro usuário', async () => {
    await repo.save(makeResource({ userId: 'other' }));

    await expect(useCase.execute({ id: 'r1', userId: USER })).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
