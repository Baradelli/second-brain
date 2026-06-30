import { ResourceNotFoundError } from '../domain/errors.js';
import type { Resource } from '../domain/resource.js';
import type { ResourceRepository } from './ports/resource-repository.js';

export interface ArchiveResourceInput {
  id: string;
  userId: string; // dono; senão ResourceNotFoundError
  archivedAt?: Date; // default: now
}

/** Soft delete de um recurso: status ARCHIVED + archivedAt. Idempotente. */
export class ArchiveResource {
  constructor(private repo: ResourceRepository) {}

  async execute(input: ArchiveResourceInput): Promise<Resource> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new ResourceNotFoundError(input.id);
    }

    // Idempotente: já arquivado mantém o archivedAt original.
    if (existing.status === 'ARCHIVED') {
      return existing;
    }

    return this.repo.update(input.id, {
      status: 'ARCHIVED',
      archivedAt: input.archivedAt ?? new Date(),
    });
  }
}
