import { beforeEach, describe, expect, it } from 'vitest';

import {
  HighlightColorNotFoundError,
  InvalidHighlightError,
} from '../../domain/errors.js';
import { HighlightRepositoryFake } from '../_fakes/highlight-repository-fake.js';
import { SettingsRepositoryFake } from '../_fakes/settings-repository-fake.js';
import { CreateHighlight } from '../create-highlight.js';

function setup() {
  const repo = new HighlightRepositoryFake();
  const settings = new SettingsRepositoryFake();
  const useCase = new CreateHighlight(repo, settings);
  return { repo, settings, useCase };
}

const baseInput = {
  userId: 'user-1',
  resourceId: 'res-1',
  colorId: 'hl-yellow', // existe no seed
  quote: 'Você não sobe ao nível dos seus objetivos',
};

describe('CreateHighlight', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  it('creates with defaults ACTIVE/archivedAt=null and persists', async () => {
    const result = await ctx.useCase.execute(baseInput);

    expect(result.id).toBeTruthy();
    expect(result.userId).toBe('user-1');
    expect(result.resourceId).toBe('res-1');
    expect(result.colorId).toBe('hl-yellow');
    expect(result.quote).toBe(baseInput.quote);
    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt).toBeNull();
    expect(result.createdAt).toBeInstanceOf(Date);

    expect(ctx.repo.saved).toHaveLength(1);
    expect(ctx.repo.saved[0].id).toBe(result.id);
  });

  it('trims quote and rejects empty / whitespace-only quote', async () => {
    await expect(
      ctx.useCase.execute({ ...baseInput, quote: '   ' }),
    ).rejects.toThrow(InvalidHighlightError);

    const ok = await ctx.useCase.execute({ ...baseInput, quote: '  oi  ' });
    expect(ok.quote).toBe('oi');
  });

  it('optional location/comment default to null', async () => {
    const result = await ctx.useCase.execute(baseInput);
    expect(result.location).toBeNull();
    expect(result.comment).toBeNull();
  });

  it('keeps provided location and comment', async () => {
    const result = await ctx.useCase.execute({
      ...baseInput,
      location: 'p. 42',
      comment: 'lembrar disso',
    });
    expect(result.location).toBe('p. 42');
    expect(result.comment).toBe('lembrar disso');
  });

  it('accepts a seed-default color even when user has no settings row', async () => {
    // settings fake returns null for unknown user → paleta efetiva é o seed
    const result = await ctx.useCase.execute({ ...baseInput, colorId: 'hl-orange' });
    expect(result.colorId).toBe('hl-orange');
  });

  it('rejects a colorId absent from the effective palette', async () => {
    await expect(
      ctx.useCase.execute({ ...baseInput, colorId: 'does-not-exist' }),
    ).rejects.toThrow(HighlightColorNotFoundError);
  });

  it('validates against the configured palette when the user has one', async () => {
    await ctx.settings.upsert('user-1', {
      highlightColors: [
        { id: 'custom-1', color: '#123456', name: 'Minha cor', order: 0 },
      ],
    });

    const ok = await ctx.useCase.execute({ ...baseInput, colorId: 'custom-1' });
    expect(ok.colorId).toBe('custom-1');

    // seed deixa de valer quando o usuário tem paleta própria
    await expect(
      ctx.useCase.execute({ ...baseInput, colorId: 'hl-yellow' }),
    ).rejects.toThrow(HighlightColorNotFoundError);
  });
});
