import {
  PublicationNotArchivedError,
  PublicationNotFoundError,
} from '../domain/errors.js';
import type { Publication } from '../domain/publication.js';
import type { PublicationRepository } from './ports/publication-repository.js';

export interface DeletePublicationInput {
  id: string;
  userId: string; // dono; senão PublicationNotFoundError (não vaza)
}

/**
 * Hard delete de uma publicação arquivada. A publicação é uma folha (sua fonte e
 * o rascunho são referências de saída), então basta estar arquivada.
 * Ver docs/adr/0004-politica-de-exclusao.md.
 */
export class DeletePublication {
  constructor(private repo: PublicationRepository) {}

  async execute(input: DeletePublicationInput): Promise<Publication> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new PublicationNotFoundError(input.id);
    }

    if (existing.status !== 'ARCHIVED') {
      throw new PublicationNotArchivedError(input.id);
    }

    await this.repo.delete(input.id);
    return existing;
  }
}
