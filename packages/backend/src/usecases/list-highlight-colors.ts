import {
  effectiveHighlightColors,
  type HighlightColor,
} from '../domain/settings.js';
import type { SettingsRepository } from './ports/settings-repository.js';

export interface ListHighlightColorsInput {
  userId: string;
}

/** Devolve a paleta efetiva do usuário: a configurada, ou o seed se ainda não mexeu. */
export class ListHighlightColors {
  constructor(private settings: SettingsRepository) {}

  async execute(input: ListHighlightColorsInput): Promise<HighlightColor[]> {
    const current = await this.settings.getByUserId(input.userId);
    return effectiveHighlightColors(current?.highlightColors ?? []);
  }
}
