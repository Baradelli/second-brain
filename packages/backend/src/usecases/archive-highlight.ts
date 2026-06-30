import { HighlightNotFoundError } from '../domain/errors.js';
import type { Highlight } from '../domain/highlight.js';
import type { HighlightRepository } from './ports/highlight-repository.js';

export interface ArchiveHighlightInput {
  id: string;
  userId: string; // dono; senão HighlightNotFoundError
  archivedAt?: Date; // default: now
}

/** Soft delete de um grifo: status ARCHIVED + archivedAt. Idempotente. */
export class ArchiveHighlight {
  constructor(private repo: HighlightRepository) {}

  async execute(input: ArchiveHighlightInput): Promise<Highlight> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new HighlightNotFoundError(input.id);
    }

    if (existing.status === 'ARCHIVED') {
      return existing;
    }

    return this.repo.update(input.id, {
      status: 'ARCHIVED',
      archivedAt: input.archivedAt ?? new Date(),
    });
  }
}
