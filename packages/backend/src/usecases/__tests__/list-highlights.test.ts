import { beforeEach, describe, expect, it } from 'vitest';

import { HighlightRepositoryFake } from '../_fakes/highlight-repository-fake.js';
import { SettingsRepositoryFake } from '../_fakes/settings-repository-fake.js';
import { ArchiveHighlight } from '../archive-highlight.js';
import { CreateHighlight } from '../create-highlight.js';
import { ListHighlights } from '../list-highlights.js';

function setup() {
  const repo = new HighlightRepositoryFake();
  const settings = new SettingsRepositoryFake();
  const create = new CreateHighlight(repo, settings);
  const archive = new ArchiveHighlight(repo);
  const useCase = new ListHighlights(repo);
  return { repo, create, archive, useCase };
}

describe('ListHighlights', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  it('lists ACTIVE highlights of a resource by default', async () => {
    await ctx.create.execute({
      userId: 'user-1',
      resourceId: 'res-1',
      colorId: 'hl-yellow',
      quote: 'a',
    });
    const second = await ctx.create.execute({
      userId: 'user-1',
      resourceId: 'res-1',
      colorId: 'hl-pink',
      quote: 'b',
    });
    await ctx.archive.execute({ id: second.id, userId: 'user-1' });

    const list = await ctx.useCase.execute({
      userId: 'user-1',
      resourceId: 'res-1',
    });
    expect(list).toHaveLength(1);
    expect(list[0].quote).toBe('a');
  });

  it('can list ARCHIVED highlights', async () => {
    const h = await ctx.create.execute({
      userId: 'user-1',
      resourceId: 'res-1',
      colorId: 'hl-yellow',
      quote: 'a',
    });
    await ctx.archive.execute({ id: h.id, userId: 'user-1' });

    const list = await ctx.useCase.execute({
      userId: 'user-1',
      resourceId: 'res-1',
      status: 'ARCHIVED',
    });
    expect(list).toHaveLength(1);
  });

  it('does not leak highlights from another resource or user', async () => {
    await ctx.create.execute({
      userId: 'user-1',
      resourceId: 'res-1',
      colorId: 'hl-yellow',
      quote: 'mine',
    });
    await ctx.create.execute({
      userId: 'user-1',
      resourceId: 'res-2',
      colorId: 'hl-yellow',
      quote: 'other-resource',
    });
    await ctx.create.execute({
      userId: 'user-2',
      resourceId: 'res-1',
      colorId: 'hl-yellow',
      quote: 'other-user',
    });

    const list = await ctx.useCase.execute({
      userId: 'user-1',
      resourceId: 'res-1',
    });
    expect(list.map((h) => h.quote)).toEqual(['mine']);
  });
});
