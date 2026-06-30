import { PublicationNotFoundError } from '../domain/errors.js';
import type { Publication } from '../domain/publication.js';
import type { PublicationRepository } from './ports/publication-repository.js';

export interface UnarchivePublicationInput {
  id: string;
  userId: string; // dono; senão PublicationNotFoundError
}

/** Restaura uma publicação arquivada: volta a ACTIVE e limpa `archivedAt`. Idempotente. */
export class UnarchivePublication {
  constructor(private repo: PublicationRepository) {}

  async execute(input: UnarchivePublicationInput): Promise<Publication> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new PublicationNotFoundError(input.id);
    }

    return this.repo.update(input.id, { status: 'ACTIVE', archivedAt: null });
  }
}
