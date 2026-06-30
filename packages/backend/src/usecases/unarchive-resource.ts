import { ResourceNotFoundError } from '../domain/errors.js';
import type { Resource } from '../domain/resource.js';
import type { ResourceRepository } from './ports/resource-repository.js';

export interface UnarchiveResourceInput {
  id: string;
  userId: string; // dono; senão ResourceNotFoundError
}

/** Restaura um recurso arquivado: volta a ACTIVE e limpa `archivedAt`. Idempotente. */
export class UnarchiveResource {
  constructor(private repo: ResourceRepository) {}

  async execute(input: UnarchiveResourceInput): Promise<Resource> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new ResourceNotFoundError(input.id);
    }

    return this.repo.update(input.id, { status: 'ACTIVE', archivedAt: null });
  }
}
