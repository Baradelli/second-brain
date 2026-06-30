import { beforeEach, describe, expect, it } from 'vitest';

import { PublicationNotFoundError } from '../../domain/errors.js';
import type { Publication } from '../../domain/publication.js';
import { PublicationRepositoryFake } from '../_fakes/publication-repository-fake.js';
import { UnarchivePublication } from '../unarchive-publication.js';

const USER = 'user-1';

function makePublication(overrides?: Partial<Publication>): Publication {
  return {
    id: 'p1',
    userId: USER,
    sourceType: 'note',
    sourceId: 'src',
    format: 'blog',
    stage: 'draft',
    title: 'Pub',
    noteId: null,
    publishedAt: null,
    status: 'ARCHIVED',
    archivedAt: new Date('2026-06-03T00:00:00.000Z'),
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

describe('UnarchivePublication', () => {
  let repo: PublicationRepositoryFake;
  let useCase: UnarchivePublication;

  beforeEach(() => {
    repo = new PublicationRepositoryFake();
    useCase = new UnarchivePublication(repo);
  });

  it('restaura a publicação (ACTIVE + archivedAt nulo)', async () => {
    await repo.save(makePublication());

    const result = await useCase.execute({ id: 'p1', userId: USER });

    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt).toBeNull();
  });

  it('não restaura publicação de outro usuário', async () => {
    await repo.save(makePublication({ userId: 'other' }));

    await expect(useCase.execute({ id: 'p1', userId: USER })).rejects.toThrow(
      PublicationNotFoundError,
    );
  });
});
