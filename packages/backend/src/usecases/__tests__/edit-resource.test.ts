import { beforeEach, describe, expect, it } from 'vitest';

import { ResourceNotFoundError } from '../../domain/errors.js';
import type { Resource } from '../../domain/resource.js';
import { EditResource } from '../edit-resource.js';
import { ResourceRepositoryFake } from '../_fakes/resource-repository-fake.js';

function makeResource(overrides?: Partial<Resource>): Resource {
  return {
    id: 'res-1',
    userId: 'user-1',
    title: 'Original',
    type: 'book',
    url: null,
    author: null,
    description: null,
    stage: 'backlog',
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-04T10:00:00.000Z'),
    labelIds: ['l1'],
    ...overrides,
  };
}

describe('EditResource', () => {
  let repo: ResourceRepositoryFake;
  let useCase: EditResource;

  beforeEach(() => {
    repo = new ResourceRepositoryFake();
    useCase = new EditResource(repo);
  });

  it('applies only present fields (partial patch); absent stay unchanged', async () => {
    await repo.save(makeResource());

    const result = await useCase.execute({
      id: 'res-1',
      userId: 'user-1',
      title: 'New title',
    });

    expect(result.title).toBe('New title');
    expect(result.type).toBe('book');
    expect(result.stage).toBe('backlog');
    expect(result.labelIds).toEqual(['l1']);
    expect(result.author).toBeNull();
  });

  it('throws ResourceNotFoundError for unknown id', async () => {
    await expect(
      useCase.execute({ id: 'ghost', userId: 'user-1', title: 'x' }),
    ).rejects.toThrow(ResourceNotFoundError);
  });

  it('throws ResourceNotFoundError when userId is not the owner (no leak)', async () => {
    await repo.save(makeResource({ userId: 'owner' }));

    await expect(
      useCase.execute({ id: 'res-1', userId: 'intruder', title: 'x' }),
    ).rejects.toThrow(ResourceNotFoundError);

    // unchanged
    const persisted = await repo.byId('res-1');
    expect(persisted?.title).toBe('Original');
  });

  it('labelIds present replaces the set; absent keeps current', async () => {
    await repo.save(makeResource({ labelIds: ['l1', 'l2'] }));

    const replaced = await useCase.execute({
      id: 'res-1',
      userId: 'user-1',
      labelIds: ['l3'],
    });
    expect(replaced.labelIds).toEqual(['l3']);

    const kept = await useCase.execute({ id: 'res-1', userId: 'user-1', title: 'y' });
    expect(kept.labelIds).toEqual(['l3']);
  });

  it('moves stage freely in any direction', async () => {
    await repo.save(makeResource({ stage: 'backlog' }));

    const toDone = await useCase.execute({
      id: 'res-1',
      userId: 'user-1',
      stage: 'done',
    });
    expect(toDone.stage).toBe('done');

    const backToProgress = await useCase.execute({
      id: 'res-1',
      userId: 'user-1',
      stage: 'in_progress',
    });
    expect(backToProgress.stage).toBe('in_progress');
  });

  it('never changes status/archivedAt via edit', async () => {
    await repo.save(
      makeResource({ status: 'ACTIVE', archivedAt: null }),
    );

    const result = await useCase.execute({
      id: 'res-1',
      userId: 'user-1',
      // @ts-expect-error status is not an editable field
      status: 'ARCHIVED',
      // @ts-expect-error archivedAt is not an editable field
      archivedAt: new Date(),
    });

    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt).toBeNull();
  });

  it('can set optional fields to null explicitly', async () => {
    await repo.save(makeResource({ author: 'Someone', url: 'http://x' }));

    const result = await useCase.execute({
      id: 'res-1',
      userId: 'user-1',
      author: null,
      url: null,
    });

    expect(result.author).toBeNull();
    expect(result.url).toBeNull();
  });
});
