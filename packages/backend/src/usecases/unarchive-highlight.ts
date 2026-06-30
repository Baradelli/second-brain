import { HighlightNotFoundError } from '../domain/errors.js';
import type { Highlight } from '../domain/highlight.js';
import type { HighlightRepository } from './ports/highlight-repository.js';

export interface UnarchiveHighlightInput {
  id: string;
  userId: string; // dono; senão HighlightNotFoundError
}

/** Restaura um grifo arquivado: volta a ACTIVE e limpa `archivedAt`. Idempotente. */
export class UnarchiveHighlight {
  constructor(private repo: HighlightRepository) {}

  async execute(input: UnarchiveHighlightInput): Promise<Highlight> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new HighlightNotFoundError(input.id);
    }

    return this.repo.update(input.id, { status: 'ACTIVE', archivedAt: null });
  }
}
