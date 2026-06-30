import {
  LabelInUseError,
  LabelNotArchivedError,
  LabelNotFoundError,
} from '../domain/errors.js';
import type { Label } from '../domain/label.js';
import type { LabelRepository } from './ports/label-repository.js';

export interface DeleteLabelInput {
  id: string;
  userId: string; // dono; senão LabelNotFoundError (não vaza)
}

/**
 * Hard delete de uma label arquivada. Bloqueado se ainda houver uso (itens) ou
 * filhas ativas — mesma checagem do archive. Ver docs/adr/0004-politica-de-exclusao.md.
 */
export class DeleteLabel {
  constructor(private repo: LabelRepository) {}

  async execute(input: DeleteLabelInput): Promise<Label> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new LabelNotFoundError(input.id);
    }

    if (existing.status !== 'ARCHIVED') {
      throw new LabelNotArchivedError(input.id);
    }

    const usage = await this.repo.usageCount(input.id);
    if (usage.items > 0) {
      throw new LabelInUseError('items', usage.items);
    }
    if (usage.activeChildren > 0) {
      throw new LabelInUseError('activeChildren', usage.activeChildren);
    }

    await this.repo.delete(input.id);
    return existing;
  }
}
