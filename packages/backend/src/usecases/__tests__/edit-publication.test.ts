import { beforeEach, describe, expect, it } from 'vitest';

import {
  InvalidPublicationError,
  PublicationNotFoundError,
} from '../../domain/errors.js';
import type { Publication } from '../../domain/publication.js';
import { PublicationRepositoryFake } from '../_fakes/publication-repository-fake.js';
import { EditPublication } from '../edit-publication.js';

function seed(
  repo: PublicationRepositoryFake,
  overrides?: Partial<Publication>,
): Publication {
  const publication: Publication = {
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
  };
  void repo.save(publication);
  return publication;
}

describe('EditPublication', () => {
  let repo: PublicationRepositoryFake;
  let useCase: EditPublication;

  beforeEach(() => {
    repo = new PublicationRepositoryFake();
    useCase = new EditPublication(repo);
  });

  it('applies a partial patch to title, format, noteId and labelIds', async () => {
    seed(repo);

    const result = await useCase.execute({
      id: 'pub-1',
      userId: 'user-1',
      title: 'Título novo',
      format: 'substack',
      noteId: 'note-7',
      labelIds: ['l1'],
    });

    expect(result.title).toBe('Título novo');
    expect(result.format).toBe('substack');
    expect(result.noteId).toBe('note-7');
    expect(result.labelIds).toEqual(['l1']);
    // untouched
    expect(result.stage).toBe('idea');
    expect(result.sourceId).toBe('si-1');
  });

  it('moves stage and, on first reaching published, sets publishedAt', async () => {
    seed(repo);
    const now = new Date('2026-06-27T12:00:00.000Z');

    const result = await useCase.execute({
      id: 'pub-1',
      userId: 'user-1',
      stage: 'published',
      publishedAt: now,
    });

    expect(result.stage).toBe('published');
    expect(result.publishedAt?.toISOString()).toBe(now.toISOString());
  });

  it('keeps the original publishedAt when leaving published (history)', async () => {
    const original = new Date('2026-06-25T08:00:00.000Z');
    seed(repo, { stage: 'published', publishedAt: original });

    const result = await useCase.execute({
      id: 'pub-1',
      userId: 'user-1',
      stage: 'draft',
      publishedAt: new Date('2026-06-27T12:00:00.000Z'),
    });

    expect(result.stage).toBe('draft');
    expect(result.publishedAt?.toISOString()).toBe(original.toISOString());
  });

  it('does not overwrite publishedAt when already published and staying published', async () => {
    const original = new Date('2026-06-25T08:00:00.000Z');
    seed(repo, { stage: 'published', publishedAt: original });

    const result = await useCase.execute({
      id: 'pub-1',
      userId: 'user-1',
      title: 'edit while published',
      stage: 'published',
      publishedAt: new Date('2026-06-27T12:00:00.000Z'),
    });

    expect(result.publishedAt?.toISOString()).toBe(original.toISOString());
  });

  it('never touches status / archivedAt', async () => {
    seed(repo, { status: 'ACTIVE' });

    const result = await useCase.execute({
      id: 'pub-1',
      userId: 'user-1',
      stage: 'published',
    });

    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt).toBeNull();
  });

  it('rejects an invalid stage', async () => {
    seed(repo);
    await expect(
      useCase.execute({
        id: 'pub-1',
        userId: 'user-1',
        // @ts-expect-error testing defensive validation
        stage: 'archived',
      }),
    ).rejects.toThrow(InvalidPublicationError);
  });

  it('rejects an invalid format', async () => {
    seed(repo);
    await expect(
      useCase.execute({
        id: 'pub-1',
        userId: 'user-1',
        // @ts-expect-error testing defensive validation
        format: 'tiktok',
      }),
    ).rejects.toThrow(InvalidPublicationError);
  });

  it('rejects an empty title', async () => {
    seed(repo);
    await expect(
      useCase.execute({ id: 'pub-1', userId: 'user-1', title: '  ' }),
    ).rejects.toThrow(InvalidPublicationError);
  });

  it('throws PublicationNotFoundError for a wrong owner (does not leak)', async () => {
    seed(repo);
    await expect(
      useCase.execute({ id: 'pub-1', userId: 'intruder', title: 'hack' }),
    ).rejects.toThrow(PublicationNotFoundError);
  });

  it('throws PublicationNotFoundError for an unknown id', async () => {
    await expect(
      useCase.execute({ id: 'ghost', userId: 'user-1', title: 'x' }),
    ).rejects.toThrow(PublicationNotFoundError);
  });
});
