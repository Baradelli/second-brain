import { beforeEach, describe, expect, it } from 'vitest';

import type { Publication } from '../../domain/publication.js';
import { PublicationRepositoryFake } from '../_fakes/publication-repository-fake.js';
import { ListPublications } from '../list-publications.js';

function make(overrides: Partial<Publication>): Publication {
  return {
    id: 'pub',
    userId: 'user-1',
    sourceType: 'study_item',
    sourceId: 'si-1',
    format: 'blog',
    stage: 'idea',
    title: 'Rascunho',
    noteId: null,
    publishedAt: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-20T10:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

describe('ListPublications', () => {
  let repo: PublicationRepositoryFake;
  let useCase: ListPublications;

  beforeEach(() => {
    repo = new PublicationRepositoryFake();
    useCase = new ListPublications(repo);
  });

  it('defaults to ACTIVE status only', async () => {
    await repo.save(make({ id: 'a', status: 'ACTIVE' }));
    await repo.save(make({ id: 'b', status: 'ARCHIVED' }));

    const result = await useCase.execute({ userId: 'user-1' });

    expect(result.map((p) => p.id)).toEqual(['a']);
  });

  it('filters by stage', async () => {
    await repo.save(make({ id: 'idea', stage: 'idea' }));
    await repo.save(make({ id: 'pub', stage: 'published' }));

    const result = await useCase.execute({
      userId: 'user-1',
      stage: 'published',
    });

    expect(result.map((p) => p.id)).toEqual(['pub']);
  });

  it('filters by format', async () => {
    await repo.save(make({ id: 'blog', format: 'blog' }));
    await repo.save(make({ id: 'video', format: 'video' }));

    const result = await useCase.execute({ userId: 'user-1', format: 'video' });

    expect(result.map((p) => p.id)).toEqual(['video']);
  });

  it('can list ARCHIVED explicitly', async () => {
    await repo.save(make({ id: 'a', status: 'ACTIVE' }));
    await repo.save(make({ id: 'b', status: 'ARCHIVED' }));

    const result = await useCase.execute({
      userId: 'user-1',
      status: 'ARCHIVED',
    });

    expect(result.map((p) => p.id)).toEqual(['b']);
  });

  it('does not leak publications from another user', async () => {
    await repo.save(make({ id: 'mine', userId: 'user-1' }));
    await repo.save(make({ id: 'theirs', userId: 'user-2' }));

    const result = await useCase.execute({ userId: 'user-1' });

    expect(result.map((p) => p.id)).toEqual(['mine']);
  });
});
