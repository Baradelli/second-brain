import { beforeEach, describe, expect, it } from 'vitest';

import type { Resource } from '../../domain/resource.js';
import { ListResources } from '../list-resources.js';
import { ResourceRepositoryFake } from '../_fakes/resource-repository-fake.js';

function makeResource(overrides?: Partial<Resource>): Resource {
  return {
    id: 'res-1',
    userId: 'user-1',
    title: 'X',
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

describe('ListResources', () => {
  let repo: ResourceRepositoryFake;
  let useCase: ListResources;

  beforeEach(() => {
    repo = new ResourceRepositoryFake();
    useCase = new ListResources(repo);
  });

  it('defaults to ACTIVE: archived do not appear without asking', async () => {
    await repo.save(makeResource({ id: 'active', status: 'ACTIVE' }));
    await repo.save(makeResource({ id: 'archived', status: 'ARCHIVED' }));

    const result = await useCase.execute({ userId: 'user-1' });

    const ids = result.map((r) => r.id);
    expect(ids).toContain('active');
    expect(ids).not.toContain('archived');
  });

  it('status=ARCHIVED returns only archived', async () => {
    await repo.save(makeResource({ id: 'active', status: 'ACTIVE' }));
    await repo.save(makeResource({ id: 'archived', status: 'ARCHIVED' }));

    const result = await useCase.execute({
      userId: 'user-1',
      status: 'ARCHIVED',
    });

    expect(result.map((r) => r.id)).toEqual(['archived']);
  });

  it('filters by stage', async () => {
    await repo.save(makeResource({ id: 'a', stage: 'backlog' }));
    await repo.save(makeResource({ id: 'b', stage: 'done' }));

    const result = await useCase.execute({ userId: 'user-1', stage: 'done' });
    expect(result.map((r) => r.id)).toEqual(['b']);
  });

  it('filters by labelId', async () => {
    await repo.save(makeResource({ id: 'with', labelIds: ['l1'] }));
    await repo.save(makeResource({ id: 'without', labelIds: ['l2'] }));

    const result = await useCase.execute({ userId: 'user-1', labelId: 'l1' });
    expect(result.map((r) => r.id)).toEqual(['with']);
  });

  it('combines filters (stage + labelId)', async () => {
    await repo.save(
      makeResource({ id: 'match', stage: 'done', labelIds: ['l1'] }),
    );
    await repo.save(
      makeResource({ id: 'wrong-stage', stage: 'backlog', labelIds: ['l1'] }),
    );
    await repo.save(
      makeResource({ id: 'wrong-label', stage: 'done', labelIds: ['l2'] }),
    );

    const result = await useCase.execute({
      userId: 'user-1',
      stage: 'done',
      labelId: 'l1',
    });
    expect(result.map((r) => r.id)).toEqual(['match']);
  });

  it('never returns resources of another user', async () => {
    await repo.save(makeResource({ id: 'mine', userId: 'user-1' }));
    await repo.save(makeResource({ id: 'theirs', userId: 'user-2' }));

    const result = await useCase.execute({ userId: 'user-1' });
    expect(result.map((r) => r.id)).toEqual(['mine']);
  });
});
