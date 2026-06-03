import type { Label } from '../../domain/label.js';

export interface LabelUsage {
  items: number;
  activeChildren: number;
}

export interface LabelRepository {
  save(label: Label): Promise<Label>;
  byId(id: string): Promise<Label | null>;
  listByUser(userId: string, status?: 'ACTIVE' | 'ARCHIVED'): Promise<Label[]>;
  update(id: string, patch: Partial<Label>): Promise<Label>;
  usageCount(labelId: string): Promise<LabelUsage>;
}
