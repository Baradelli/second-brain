import { LabelNotFoundError } from '../domain/errors.js';
import type { Label } from '../domain/label.js';
import type { LabelRepository } from './ports/label-repository.js';

export interface UnarchiveLabelInput {
  id: string;
  userId: string; // dono; senão LabelNotFoundError
}

/** Restaura uma label arquivada: volta a ACTIVE e limpa `archivedAt`. Idempotente. */
export class UnarchiveLabel {
  constructor(private repo: LabelRepository) {}

  async execute(input: UnarchiveLabelInput): Promise<Label> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new LabelNotFoundError(input.id);
    }

    return this.repo.update(input.id, { status: 'ACTIVE', archivedAt: null });
  }
}
