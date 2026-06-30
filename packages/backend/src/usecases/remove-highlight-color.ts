import {
  HighlightColorInUseError,
  HighlightColorNotFoundError,
} from '../domain/errors.js';
import { effectiveHighlightColors } from '../domain/settings.js';
import type { HighlightRepository } from './ports/highlight-repository.js';
import type { SettingsRepository } from './ports/settings-repository.js';

export interface RemoveHighlightColorInput {
  userId: string;
  id: string;
}

/**
 * Remove uma cor da paleta. Bloqueado se algum grifo ativo ainda a usa
 * (filosofia do ADR 0004: não deixa referência forte órfã).
 */
export class RemoveHighlightColor {
  constructor(
    private settings: SettingsRepository,
    private highlights: HighlightRepository,
  ) {}

  async execute(input: RemoveHighlightColorInput): Promise<void> {
    const current = await this.settings.getByUserId(input.userId);
    const palette = effectiveHighlightColors(current?.highlightColors ?? []);

    if (!palette.some((c) => c.id === input.id)) {
      throw new HighlightColorNotFoundError(input.id);
    }

    const inUse = await this.highlights.countByColor(input.userId, input.id);
    if (inUse > 0) {
      throw new HighlightColorInUseError(inUse);
    }

    await this.settings.upsert(input.userId, {
      highlightColors: palette.filter((c) => c.id !== input.id),
    });
  }
}
