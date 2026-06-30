import { beforeEach, describe, expect, it } from 'vitest';

import {
  HighlightColorNotFoundError,
  HighlightNotFoundError,
  InvalidHighlightError,
} from '../../domain/errors.js';
import { HighlightRepositoryFake } from '../_fakes/highlight-repository-fake.js';
import { SettingsRepositoryFake } from '../_fakes/settings-repository-fake.js';
import { CreateHighlight } from '../create-highlight.js';
import { EditHighlight } from '../edit-highlight.js';

function setup() {
  const repo = new HighlightRepositoryFake();
  const settings = new SettingsRepositoryFake();
  const create = new CreateHighlight(repo, settings);
  const useCase = new EditHighlight(repo, settings);
  return { repo, settings, create, useCase };
}

async function seed(ctx: ReturnType<typeof setup>) {
  return ctx.create.execute({
    userId: 'user-1',
    resourceId: 'res-1',
    colorId: 'hl-yellow',
    quote: 'original',
  });
}

describe('EditHighlight', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  it('throws not-found for unknown id or another user (no leak)', async () => {
    const h = await seed(ctx);
    await expect(
      ctx.useCase.execute({ id: 'nope', userId: 'user-1' }),
    ).rejects.toThrow(HighlightNotFoundError);
    await expect(
      ctx.useCase.execute({ id: h.id, userId: 'intruder' }),
    ).rejects.toThrow(HighlightNotFoundError);
  });

  it('updates quote (trimmed), location and comment', async () => {
    const h = await seed(ctx);
    const updated = await ctx.useCase.execute({
      id: h.id,
      userId: 'user-1',
      quote: '  novo  ',
      location: 'p. 10',
      comment: 'um comentário',
    });
    expect(updated.quote).toBe('novo');
    expect(updated.location).toBe('p. 10');
    expect(updated.comment).toBe('um comentário');
  });

  it('rejects empty quote', async () => {
    const h = await seed(ctx);
    await expect(
      ctx.useCase.execute({ id: h.id, userId: 'user-1', quote: '   ' }),
    ).rejects.toThrow(InvalidHighlightError);
  });

  it('can clear location/comment to null', async () => {
    const h = await ctx.create.execute({
      userId: 'user-1',
      resourceId: 'res-1',
      colorId: 'hl-yellow',
      quote: 'q',
      location: 'p. 1',
      comment: 'c',
    });
    const updated = await ctx.useCase.execute({
      id: h.id,
      userId: 'user-1',
      location: null,
      comment: null,
    });
    expect(updated.location).toBeNull();
    expect(updated.comment).toBeNull();
  });

  it('revalidates colorId against the palette when changed', async () => {
    const h = await seed(ctx);
    const ok = await ctx.useCase.execute({
      id: h.id,
      userId: 'user-1',
      colorId: 'hl-blue',
    });
    expect(ok.colorId).toBe('hl-blue');

    await expect(
      ctx.useCase.execute({ id: h.id, userId: 'user-1', colorId: 'ghost' }),
    ).rejects.toThrow(HighlightColorNotFoundError);
  });

  it('never touches status/archivedAt', async () => {
    const h = await seed(ctx);
    const updated = await ctx.useCase.execute({
      id: h.id,
      userId: 'user-1',
      quote: 'x',
    });
    expect(updated.status).toBe('ACTIVE');
    expect(updated.archivedAt).toBeNull();
  });
});
