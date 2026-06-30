import {
  HighlightColorNotFoundError,
  InvalidHighlightError,
} from '../domain/errors.js';
import {
  effectiveHighlightColors,
  type HighlightColor,
} from '../domain/settings.js';
import type { SettingsRepository } from './ports/settings-repository.js';

export interface EditHighlightColorInput {
  userId: string;
  id: string;
  color?: string;
  name?: string;
  order?: number;
}

/** Renomeia/recolore/reordena uma cor da paleta por id. Persiste a paleta efetiva. */
export class EditHighlightColor {
  constructor(private settings: SettingsRepository) {}

  async execute(input: EditHighlightColorInput): Promise<HighlightColor> {
    const current = await this.settings.getByUserId(input.userId);
    const palette = effectiveHighlightColors(current?.highlightColors ?? []);

    const target = palette.find((c) => c.id === input.id);
    if (!target) {
      throw new HighlightColorNotFoundError(input.id);
    }

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length === 0) {
        throw new InvalidHighlightError('color name must not be empty');
      }
      target.name = name;
    }
    if (input.color !== undefined) target.color = input.color;
    if (input.order !== undefined) target.order = input.order;

    await this.settings.upsert(input.userId, { highlightColors: palette });
    return { ...target };
  }
}
