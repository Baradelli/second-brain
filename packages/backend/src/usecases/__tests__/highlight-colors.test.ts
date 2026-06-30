import { beforeEach, describe, expect, it } from 'vitest';

import {
  HighlightColorInUseError,
  HighlightColorNotFoundError,
} from '../../domain/errors.js';
import { DEFAULT_HIGHLIGHT_COLORS } from '../../domain/settings.js';
import { HighlightRepositoryFake } from '../_fakes/highlight-repository-fake.js';
import { SettingsRepositoryFake } from '../_fakes/settings-repository-fake.js';
import { AddHighlightColor } from '../add-highlight-color.js';
import { CreateHighlight } from '../create-highlight.js';
import { EditHighlightColor } from '../edit-highlight-color.js';
import { ListHighlightColors } from '../list-highlight-colors.js';
import { RemoveHighlightColor } from '../remove-highlight-color.js';

function setup() {
  const highlights = new HighlightRepositoryFake();
  const settings = new SettingsRepositoryFake();
  return {
    highlights,
    settings,
    list: new ListHighlightColors(settings),
    add: new AddHighlightColor(settings),
    edit: new EditHighlightColor(settings),
    remove: new RemoveHighlightColor(settings, highlights),
    create: new CreateHighlight(highlights, settings),
  };
}

describe('ListHighlightColors', () => {
  it('returns the seed palette when the user has not configured one', async () => {
    const ctx = setup();
    const palette = await ctx.list.execute({ userId: 'user-1' });
    expect(palette).toHaveLength(DEFAULT_HIGHLIGHT_COLORS.length);
    expect(palette.map((c) => c.id)).toContain('hl-yellow');
  });

  it('returns the configured palette sorted by order', async () => {
    const ctx = setup();
    await ctx.settings.upsert('user-1', {
      highlightColors: [
        { id: 'b', color: '#000', name: 'B', order: 1 },
        { id: 'a', color: '#fff', name: 'A', order: 0 },
      ],
    });
    const palette = await ctx.list.execute({ userId: 'user-1' });
    expect(palette.map((c) => c.id)).toEqual(['a', 'b']);
  });
});

describe('AddHighlightColor', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it('appends a new color (persisting the seed) with a fresh id at the end', async () => {
    const created = await ctx.add.execute({
      userId: 'user-1',
      color: '#7C3AED',
      name: 'Roxo',
    });
    expect(created.id).toBeTruthy();

    const palette = await ctx.list.execute({ userId: 'user-1' });
    expect(palette).toHaveLength(DEFAULT_HIGHLIGHT_COLORS.length + 1);
    const last = palette[palette.length - 1];
    expect(last.name).toBe('Roxo');
    expect(last.color).toBe('#7C3AED');
    expect(last.order).toBeGreaterThan(DEFAULT_HIGHLIGHT_COLORS.length - 1);
    // seed permanece com ids estáveis
    expect(palette.map((c) => c.id)).toContain('hl-yellow');
  });
});

describe('EditHighlightColor', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it('renames and recolors a seed color by id (and persists the palette)', async () => {
    const updated = await ctx.edit.execute({
      userId: 'user-1',
      id: 'hl-yellow',
      name: 'Destaque',
      color: '#EAB308',
    });
    expect(updated.name).toBe('Destaque');
    expect(updated.color).toBe('#EAB308');

    const palette = await ctx.list.execute({ userId: 'user-1' });
    expect(palette.find((c) => c.id === 'hl-yellow')?.name).toBe('Destaque');
  });

  it('throws not-found for an unknown color id', async () => {
    await expect(
      ctx.edit.execute({ userId: 'user-1', id: 'ghost', name: 'X' }),
    ).rejects.toThrow(HighlightColorNotFoundError);
  });
});

describe('RemoveHighlightColor', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it('removes a color not used by any highlight', async () => {
    await ctx.remove.execute({ userId: 'user-1', id: 'hl-blue' });
    const palette = await ctx.list.execute({ userId: 'user-1' });
    expect(palette.map((c) => c.id)).not.toContain('hl-blue');
  });

  it('blocks removal when highlights still use the color', async () => {
    await ctx.create.execute({
      userId: 'user-1',
      resourceId: 'res-1',
      colorId: 'hl-blue',
      quote: 'q',
    });
    await expect(
      ctx.remove.execute({ userId: 'user-1', id: 'hl-blue' }),
    ).rejects.toThrow(HighlightColorInUseError);
  });

  it('throws not-found for an unknown color id', async () => {
    await expect(
      ctx.remove.execute({ userId: 'user-1', id: 'ghost' }),
    ).rejects.toThrow(HighlightColorNotFoundError);
  });
});
