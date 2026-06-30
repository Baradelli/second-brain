import { beforeEach, describe, expect, it } from 'vitest';

import {
  HighlightNotArchivedError,
  HighlightNotFoundError,
} from '../../domain/errors.js';
import { HighlightRepositoryFake } from '../_fakes/highlight-repository-fake.js';
import { SettingsRepositoryFake } from '../_fakes/settings-repository-fake.js';
import { ArchiveHighlight } from '../archive-highlight.js';
import { CreateHighlight } from '../create-highlight.js';
import { DeleteHighlight } from '../delete-highlight.js';
import { UnarchiveHighlight } from '../unarchive-highlight.js';

function setup() {
  const repo = new HighlightRepositoryFake();
  const settings = new SettingsRepositoryFake();
  const create = new CreateHighlight(repo, settings);
  const archive = new ArchiveHighlight(repo);
  const unarchive = new UnarchiveHighlight(repo);
  const remove = new DeleteHighlight(repo);
  return { repo, create, archive, unarchive, remove };
}

async function seed(ctx: ReturnType<typeof setup>) {
  return ctx.create.execute({
    userId: 'user-1',
    resourceId: 'res-1',
    colorId: 'hl-yellow',
    quote: 'q',
  });
}

describe('ArchiveHighlight / UnarchiveHighlight', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it('archives (status ARCHIVED + archivedAt) and is idempotent', async () => {
    const h = await seed(ctx);
    const archived = await ctx.archive.execute({ id: h.id, userId: 'user-1' });
    expect(archived.status).toBe('ARCHIVED');
    expect(archived.archivedAt).toBeInstanceOf(Date);

    const again = await ctx.archive.execute({ id: h.id, userId: 'user-1' });
    expect(again.archivedAt).toEqual(archived.archivedAt);
  });

  it('unarchives back to ACTIVE and clears archivedAt', async () => {
    const h = await seed(ctx);
    await ctx.archive.execute({ id: h.id, userId: 'user-1' });
    const restored = await ctx.unarchive.execute({ id: h.id, userId: 'user-1' });
    expect(restored.status).toBe('ACTIVE');
    expect(restored.archivedAt).toBeNull();
  });

  it('archive throws not-found for another user', async () => {
    const h = await seed(ctx);
    await expect(
      ctx.archive.execute({ id: h.id, userId: 'intruder' }),
    ).rejects.toThrow(HighlightNotFoundError);
  });
});

describe('DeleteHighlight', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it('deletes a highlight only after it is archived', async () => {
    const h = await seed(ctx);
    await expect(
      ctx.remove.execute({ id: h.id, userId: 'user-1' }),
    ).rejects.toThrow(HighlightNotArchivedError);

    await ctx.archive.execute({ id: h.id, userId: 'user-1' });
    const deleted = await ctx.remove.execute({ id: h.id, userId: 'user-1' });
    expect(deleted.id).toBe(h.id);
    expect(ctx.repo.saved).toHaveLength(0);
  });

  it('throws not-found for another user', async () => {
    const h = await seed(ctx);
    await ctx.archive.execute({ id: h.id, userId: 'user-1' });
    await expect(
      ctx.remove.execute({ id: h.id, userId: 'intruder' }),
    ).rejects.toThrow(HighlightNotFoundError);
  });
});
