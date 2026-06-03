import { randomUUID } from 'node:crypto';

import { createLabelSchema } from '@cerebro/shared';

import { LabelCycleError, LabelParentInvalidError } from '../domain/errors.js';
import type { Label } from '../domain/label.js';
import type { LabelRepository } from './ports/label-repository.js';

export class CreateLabel {
  constructor(
    private repo: LabelRepository,
    private idGenerator: () => string = randomUUID,
  ) {}

  async execute(rawInput: unknown, now: Date = new Date()): Promise<Label> {
    const input = createLabelSchema.parse(rawInput);
    const id = this.idGenerator();
    const parentId = input.parentId ?? null;

    if (parentId !== null) {
      if (parentId === id) throw new LabelCycleError(id);

      const parent = await this.repo.byId(parentId);
      if (!parent || parent.userId !== input.userId) {
        throw new LabelParentInvalidError(parentId);
      }
    }

    const label: Label = {
      id,
      userId: input.userId,
      name: input.name,
      parentId,
      color: input.color ?? null,
      status: 'ACTIVE',
      archivedAt: null,
      createdAt: now,
    };

    return this.repo.save(label);
  }
}
