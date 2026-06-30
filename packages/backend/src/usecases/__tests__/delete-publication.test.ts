import { beforeEach, describe, expect, it } from 'vitest';

import {
  PublicationNotArchivedError,
  PublicationNotFoundError,
} from '../../domain/errors.js';
import type { Publication } from '../../domain/publication.js';
import { PublicationRepositoryFake } from '../_fakes/publication-repository-fake.js';
import { DeletePublication } from '../delete-publication.js';

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

describe('DeletePublication', () => {
  let repo: PublicationRepositoryFake;
  let useCase: DeletePublication;

  beforeEach(() => {
    repo = new PublicationRepositoryFake();
    useCase = new DeletePublication(repo);
  });

  it('apaga uma publicação arquivada', async () => {
    await repo.save(makePublication());

    const result = await useCase.execute({ id: 'p1', userId: USER });

    expect(result.id).toBe('p1');
    expect(await repo.byId('p1')).toBeNull();
  });

  it('recusa se a publicação não está arquivada', async () => {
    await repo.save(makePublication({ status: 'ACTIVE', archivedAt: null }));

    await expect(useCase.execute({ id: 'p1', userId: USER })).rejects.toThrow(
      PublicationNotArchivedError,
    );
  });

  it('não apaga publicação de outro usuário', async () => {
    await repo.save(makePublication({ userId: 'other' }));

    await expect(useCase.execute({ id: 'p1', userId: USER })).rejects.toThrow(
      PublicationNotFoundError,
    );
  });
});
