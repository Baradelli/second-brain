import { beforeEach, describe, expect, it } from 'vitest';

import { PublicationNotFoundError } from '../../domain/errors.js';
import type { Publication } from '../../domain/publication.js';
import { PublicationRepositoryFake } from '../_fakes/publication-repository-fake.js';
import { ArchivePublication } from '../archive-publication.js';

function seed(
  repo: PublicationRepositoryFake,
  overrides?: Partial<Publication>,
): void {
  void repo.save({
    id: 'pub-1',
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
  });
}

describe('ArchivePublication', () => {
  let repo: PublicationRepositoryFake;
  let useCase: ArchivePublication;

  beforeEach(() => {
    repo = new PublicationRepositoryFake();
    useCase = new ArchivePublication(repo);
  });

  it('soft-deletes: status=ARCHIVED + archivedAt set', async () => {
    seed(repo);
    const at = new Date('2026-06-27T12:00:00.000Z');

    const result = await useCase.execute({
      id: 'pub-1',
      userId: 'user-1',
      archivedAt: at,
    });

    expect(result.status).toBe('ARCHIVED');
    expect(result.archivedAt?.toISOString()).toBe(at.toISOString());
  });

  it('is idempotent: archiving an already-archived publication stays archived', async () => {
    const original = new Date('2026-06-25T08:00:00.000Z');
    seed(repo, { status: 'ARCHIVED', archivedAt: original });

    const result = await useCase.execute({ id: 'pub-1', userId: 'user-1' });

    expect(result.status).toBe('ARCHIVED');
    expect(result.archivedAt?.toISOString()).toBe(original.toISOString());
  });

  it('throws PublicationNotFoundError for a wrong owner', async () => {
    seed(repo);
    await expect(
      useCase.execute({ id: 'pub-1', userId: 'intruder' }),
    ).rejects.toThrow(PublicationNotFoundError);
  });

  it('throws PublicationNotFoundError for an unknown id', async () => {
    await expect(
      useCase.execute({ id: 'ghost', userId: 'user-1' }),
    ).rejects.toThrow(PublicationNotFoundError);
  });
});
