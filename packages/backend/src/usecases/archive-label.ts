import { LabelInUseError, LabelNotFoundError } from '../domain/errors.js';
import type { Label } from '../domain/label.js';
import type { LabelRepository } from './ports/label-repository.js';

export class ArchiveLabel {
  constructor(private repo: LabelRepository) {}

  async execute(input: { id: string }, now: Date = new Date()): Promise<Label> {
    const label = await this.repo.byId(input.id);
    if (!label) throw new LabelNotFoundError(input.id);

    const usage = await this.repo.usageCount(input.id);
    if (usage.items > 0) {
      throw new LabelInUseError('items', usage.items);
    }
    if (usage.activeChildren > 0) {
      throw new LabelInUseError('activeChildren', usage.activeChildren);
    }

    return this.repo.update(input.id, {
      status: 'ARCHIVED',
      archivedAt: now,
    });
  }
}
