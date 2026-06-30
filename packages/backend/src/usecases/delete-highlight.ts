import {
  HighlightNotArchivedError,
  HighlightNotFoundError,
} from '../domain/errors.js';
import type { Highlight } from '../domain/highlight.js';
import type { HighlightRepository } from './ports/highlight-repository.js';

export interface DeleteHighlightInput {
  id: string;
  userId: string; // dono; senão HighlightNotFoundError (não vaza)
}

/**
 * Hard delete de um grifo arquivado. Grifo não tem referências fortes, então só
 * exige estar arquivado (mesma regra geral do ADR 0004).
 */
export class DeleteHighlight {
  constructor(private repo: HighlightRepository) {}

  async execute(input: DeleteHighlightInput): Promise<Highlight> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new HighlightNotFoundError(input.id);
    }

    if (existing.status !== 'ARCHIVED') {
      throw new HighlightNotArchivedError(input.id);
    }

    await this.repo.delete(input.id);
    return existing;
  }
}
