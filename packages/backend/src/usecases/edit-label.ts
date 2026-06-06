import {
  LabelCycleError,
  LabelNotFoundError,
  LabelParentInvalidError,
} from '../domain/errors.js';
import type { Label } from '../domain/label.js';
import type { LabelRepository } from './ports/label-repository.js';

export interface EditLabelInput {
  id: string;
  userId: string; // dono; senão LabelNotFoundError (não vaza)
  name?: string;
  color?: string | null;
  parentId?: string | null; // null = vira raiz; ausente = mantém
}

export class EditLabel {
  constructor(private repo: LabelRepository) {}

  async execute(input: EditLabelInput): Promise<Label> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new LabelNotFoundError(input.id);
    }

    const patch: Partial<Label> = {};

    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.color !== undefined) patch.color = input.color;

    if (input.parentId !== undefined) {
      if (input.parentId === null) {
        patch.parentId = null; // vira raiz
      } else {
        await this.validateReparent(input.id, input.userId, input.parentId);
        patch.parentId = input.parentId;
      }
    }

    return this.repo.update(input.id, patch);
  }

  /** Garante que o novo pai existe, é do mesmo user, e não cria ciclo. */
  private async validateReparent(
    id: string,
    userId: string,
    newParentId: string,
  ): Promise<void> {
    if (newParentId === id) throw new LabelCycleError(id);

    const parent = await this.repo.byId(newParentId);
    if (!parent || parent.userId !== userId) {
      throw new LabelParentInvalidError(newParentId);
    }

    // Anda pelos ancestrais do novo pai; se encontrar `id`, seria um ciclo
    // (profundidade é livre, então o novo pai pode ser um descendente de `id`).
    const seen = new Set<string>();
    let cursor: string | null = newParentId;
    while (cursor) {
      if (cursor === id) throw new LabelCycleError(id);
      if (seen.has(cursor)) break; // proteção contra ciclo pré-existente
      seen.add(cursor);
      const node = await this.repo.byId(cursor);
      if (!node) break;
      cursor = node.parentId;
    }
  }
}
