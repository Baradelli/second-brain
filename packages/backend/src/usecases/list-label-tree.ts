import type { LabelNode } from '../domain/label.js';
import { buildLabelTree } from '../domain/label-tree.js';
import type { LabelRepository } from './ports/label-repository.js';

export class ListLabelTree {
  constructor(private repo: LabelRepository) {}

  async execute(input: {
    userId: string;
    status?: 'ACTIVE' | 'ARCHIVED';
  }): Promise<LabelNode[]> {
    const labels = await this.repo.listByUser(input.userId, input.status);
    return buildLabelTree(labels);
  }
}
