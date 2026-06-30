import {
  HighlightNotFoundError,
  InvalidHighlightError,
} from '../domain/errors.js';
import type { Highlight } from '../domain/highlight.js';
import { assertColorInPalette } from './create-highlight.js';
import type { HighlightRepository } from './ports/highlight-repository.js';
import type { SettingsRepository } from './ports/settings-repository.js';

export interface EditHighlightInput {
  id: string;
  userId: string; // dono; editar grifo de terceiro é rejeitado como not-found
  colorId?: string;
  location?: string | null;
  quote?: string;
  comment?: string | null;
}

export class EditHighlight {
  constructor(
    private repo: HighlightRepository,
    private settings: SettingsRepository,
  ) {}

  async execute(input: EditHighlightInput): Promise<Highlight> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new HighlightNotFoundError(input.id);
    }

    const patch: Partial<Highlight> = {};

    if (input.quote !== undefined) {
      const quote = input.quote.trim();
      if (quote.length === 0) {
        throw new InvalidHighlightError('quote must not be empty');
      }
      patch.quote = quote;
    }
    if (input.colorId !== undefined) {
      await assertColorInPalette(this.settings, input.userId, input.colorId);
      patch.colorId = input.colorId;
    }
    if (input.location !== undefined) patch.location = input.location;
    if (input.comment !== undefined) patch.comment = input.comment;

    // status/archivedAt nunca são tocados aqui (arquivar é separado).

    return this.repo.update(input.id, patch);
  }
}
