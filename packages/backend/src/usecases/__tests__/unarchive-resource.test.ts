import { beforeEach, describe, expect, it } from 'vitest';

import { ResourceNotFoundError } from '../../domain/errors.js';
import type { Resource } from '../../domain/resource.js';
import { ResourceRepositoryFake } from '../_fakes/resource-repository-fake.js';
import { UnarchiveResource } from '../unarchive-resource.js';

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
    status: 'ARCHIVED',
    archivedAt: new Date('2026-06-03T00:00:00.000Z'),
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

describe('UnarchiveResource', () => {
  let repo: ResourceRepositoryFake;
  let useCase: UnarchiveResource;

  beforeEach(() => {
    repo = new ResourceRepositoryFake();
    useCase = new UnarchiveResource(repo);
  });

  it('restaura o recurso (ACTIVE + archivedAt nulo)', async () => {
    await repo.save(makeResource());

    const result = await useCase.execute({ id: 'r1', userId: USER });

    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt).toBeNull();
  });

  it('não restaura recurso de outro usuário', async () => {
    await repo.save(makeResource({ userId: 'other' }));

    await expect(useCase.execute({ id: 'r1', userId: USER })).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
