import { beforeEach, describe, expect, it } from 'vitest';

import { InvalidResourceError } from '../../domain/errors.js';
import { ResourceRepositoryFake } from '../_fakes/resource-repository-fake.js';
import { CreateResource } from '../create-resource.js';

describe('CreateResource', () => {
  let repo: ResourceRepositoryFake;
  let useCase: CreateResource;

  beforeEach(() => {
    repo = new ResourceRepositoryFake();
    useCase = new CreateResource(repo);
  });

  it('creates with defaults stage=backlog, status=ACTIVE and persists', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      title: 'Domain-Driven Design',
      type: 'book',
    });

    expect(result.id).toBeTruthy();
    expect(result.userId).toBe('user-1');
    expect(result.title).toBe('Domain-Driven Design');
    expect(result.type).toBe('book');
    expect(result.stage).toBe('backlog');
    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt).toBeNull();
    expect(result.createdAt).toBeInstanceOf(Date);

    expect(repo.saved).toHaveLength(1);
    expect(repo.saved[0].id).toBe(result.id);
  });

  it('trims title and rejects empty / whitespace-only title', async () => {
    await expect(
      useCase.execute({ userId: 'user-1', title: '   ', type: 'book' }),
    ).rejects.toThrow(InvalidResourceError);

    const ok = await useCase.execute({
      userId: 'user-1',
      title: '  Refactoring  ',
      type: 'book',
    });
    expect(ok.title).toBe('Refactoring');
  });

  it('rejects a type outside the enum (defensive)', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        title: 'X',
        // @ts-expect-error testing defensive validation
        type: 'magazine',
      }),
    ).rejects.toThrow(InvalidResourceError);
  });

  it('defaults labelIds to [] when omitted', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      title: 'X',
      type: 'video',
    });
    expect(result.labelIds).toEqual([]);
  });

  it('optional fields absent become null', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      title: 'X',
      type: 'article',
    });
    expect(result.url).toBeNull();
    expect(result.author).toBeNull();
    expect(result.description).toBeNull();
  });

  it('keeps provided optional fields', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      title: 'X',
      type: 'podcast',
      url: 'https://example.com',
      author: 'Someone',
      description: 'A desc',
      labelIds: ['l1', 'l2'],
    });
    expect(result.url).toBe('https://example.com');
    expect(result.author).toBe('Someone');
    expect(result.description).toBe('A desc');
    expect(result.labelIds).toEqual(['l1', 'l2']);
  });
});
