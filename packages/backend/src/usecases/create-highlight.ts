import { randomUUID } from 'node:crypto';

import {
  HighlightColorNotFoundError,
  InvalidHighlightError,
} from '../domain/errors.js';
import type { Highlight } from '../domain/highlight.js';
import { effectiveHighlightColors } from '../domain/settings.js';
import type { HighlightRepository } from './ports/highlight-repository.js';
import type { SettingsRepository } from './ports/settings-repository.js';

export interface CreateHighlightInput {
  userId: string;
  resourceId: string;
  colorId: string;
  quote: string;
  location?: string | null;
  comment?: string | null;
}

export class CreateHighlight {
  constructor(
    private repo: HighlightRepository,
    private settings: SettingsRepository,
  ) {}

  async execute(input: CreateHighlightInput): Promise<Highlight> {
    const quote = input.quote?.trim() ?? '';
    if (quote.length === 0) {
      throw new InvalidHighlightError('quote must not be empty');
    }

    await assertColorInPalette(this.settings, input.userId, input.colorId);

    const highlight: Highlight = {
      id: randomUUID(),
      userId: input.userId,
      resourceId: input.resourceId,
      colorId: input.colorId,
      location: input.location ?? null,
      quote,
      comment: input.comment ?? null,
      status: 'ACTIVE',
      archivedAt: null,
      createdAt: new Date(),
    };

    return this.repo.save(highlight);
  }
}

/** Garante que `colorId` existe na paleta efetiva do usuário (configurada ou seed). */
export async function assertColorInPalette(
  settings: SettingsRepository,
  userId: string,
  colorId: string,
): Promise<void> {
  const current = await settings.getByUserId(userId);
  const palette = effectiveHighlightColors(current?.highlightColors ?? []);
  if (!palette.some((c) => c.id === colorId)) {
    throw new HighlightColorNotFoundError(colorId);
  }
}
