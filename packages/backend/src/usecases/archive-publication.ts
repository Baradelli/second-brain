import { PublicationNotFoundError } from '../domain/errors.js';
import type { Publication } from '../domain/publication.js';
import type { PublicationRepository } from './ports/publication-repository.js';

export interface ArchivePublicationInput {
  id: string;
  userId: string; // owner; otherwise PublicationNotFoundError
  archivedAt?: Date; // default: now
}

export class ArchivePublication {
  constructor(private repo: PublicationRepository) {}

  async execute(input: ArchivePublicationInput): Promise<Publication> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new PublicationNotFoundError(input.id);
    }

    // Idempotent: an already-archived publication keeps its original archivedAt.
    if (existing.status === 'ARCHIVED') {
      return existing;
    }

    return this.repo.update(input.id, {
      status: 'ARCHIVED',
      archivedAt: input.archivedAt ?? new Date(),
    });
  }
}
