import { randomUUID } from 'node:crypto';

import { InvalidHighlightError } from '../domain/errors.js';
import {
  effectiveHighlightColors,
  type HighlightColor,
} from '../domain/settings.js';
import type { SettingsRepository } from './ports/settings-repository.js';

export interface AddHighlightColorInput {
  userId: string;
  color: string;
  name: string;
}

/**
 * Acrescenta uma cor à paleta. Opera sobre a paleta EFETIVA: se o usuário ainda usava
 * o seed, ele é persistido junto (com ids estáveis) para não sumir ao adicionar.
 */
export class AddHighlightColor {
  constructor(private settings: SettingsRepository) {}

  async execute(input: AddHighlightColorInput): Promise<HighlightColor> {
    const name = input.name?.trim() ?? '';
    if (name.length === 0) {
      throw new InvalidHighlightError('color name must not be empty');
    }

    const current = await this.settings.getByUserId(input.userId);
    const palette = effectiveHighlightColors(current?.highlightColors ?? []);
    const nextOrder =
      palette.reduce((max, c) => Math.max(max, c.order), -1) + 1;

    const created: HighlightColor = {
      id: randomUUID(),
      color: input.color,
      name,
      order: nextOrder,
    };

    await this.settings.upsert(input.userId, {
      highlightColors: [...palette, created],
    });
    return created;
  }
}
