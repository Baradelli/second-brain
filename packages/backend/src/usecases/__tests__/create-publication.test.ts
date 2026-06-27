import { beforeEach, describe, expect, it } from 'vitest';

import { InvalidPublicationError } from '../../domain/errors.js';
import { PublicationRepositoryFake } from '../_fakes/publication-repository-fake.js';
import { CreatePublication } from '../create-publication.js';

describe('CreatePublication', () => {
  let repo: PublicationRepositoryFake;
  let useCase: CreatePublication;

  beforeEach(() => {
    repo = new PublicationRepositoryFake();
    useCase = new CreatePublication(repo);
  });

  it('creates with defaults stage=idea, status=ACTIVE, publishedAt=null and persists', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      sourceType: 'study_item',
      sourceId: 'si-1',
      format: 'blog',
      title: 'A ressurreição em Paulo',
    });

    expect(result.id).toBeTruthy();
    expect(result.userId).toBe('user-1');
    expect(result.sourceType).toBe('study_item');
    expect(result.sourceId).toBe('si-1');
    expect(result.format).toBe('blog');
    expect(result.title).toBe('A ressurreição em Paulo');
    expect(result.stage).toBe('idea');
    expect(result.status).toBe('ACTIVE');
    expect(result.publishedAt).toBeNull();
    expect(result.noteId).toBeNull();
    expect(result.archivedAt).toBeNull();
    expect(result.createdAt).toBeInstanceOf(Date);

    expect(repo.saved).toHaveLength(1);
    expect(repo.saved[0].id).toBe(result.id);
  });

  it('trims title and rejects empty / whitespace-only title', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        sourceType: 'note',
        sourceId: 'n-1',
        format: 'blog',
        title: '   ',
      }),
    ).rejects.toThrow(InvalidPublicationError);

    const ok = await useCase.execute({
      userId: 'user-1',
      sourceType: 'note',
      sourceId: 'n-1',
      format: 'blog',
      title: '  Meu post  ',
    });
    expect(ok.title).toBe('Meu post');
  });

  it('rejects an empty sourceId', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        sourceType: 'note',
        sourceId: '   ',
        format: 'blog',
        title: 'X',
      }),
    ).rejects.toThrow(InvalidPublicationError);
  });

  it('rejects a format outside the enum (defensive)', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        sourceType: 'note',
        sourceId: 'n-1',
        // @ts-expect-error testing defensive validation
        format: 'tiktok',
        title: 'X',
      }),
    ).rejects.toThrow(InvalidPublicationError);
  });

  it('rejects a sourceType outside the enum (defensive)', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        // @ts-expect-error testing defensive validation
        sourceType: 'tweet',
        sourceId: 'n-1',
        format: 'blog',
        title: 'X',
      }),
    ).rejects.toThrow(InvalidPublicationError);
  });

  it('defaults labelIds to [] and noteId to null when omitted', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      sourceType: 'recap',
      sourceId: 'r-1',
      format: 'linkedin',
      title: 'X',
    });
    expect(result.labelIds).toEqual([]);
    expect(result.noteId).toBeNull();
  });

  it('keeps provided noteId and labelIds', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      sourceType: 'resource',
      sourceId: 'res-1',
      format: 'lesson',
      title: 'X',
      noteId: 'note-99',
      labelIds: ['l1', 'l2'],
    });
    expect(result.noteId).toBe('note-99');
    expect(result.labelIds).toEqual(['l1', 'l2']);
  });
});
