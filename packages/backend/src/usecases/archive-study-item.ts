import { StudyItemNotFoundError } from '../domain/errors.js';
import type { StudyItem } from '../domain/study-item.js';
import type { StudyItemRepository } from './ports/study-item-repository.js';

export interface ArchiveStudyItemInput {
  id: string;
  userId: string; // dono; senão StudyItemNotFoundError
  archivedAt?: Date; // default: now
}

export class ArchiveStudyItem {
  constructor(private repo: StudyItemRepository) {}

  async execute(input: ArchiveStudyItemInput): Promise<StudyItem> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new StudyItemNotFoundError(input.id);
    }

    // Idempotente: já arquivado mantém o archivedAt original (não "re-arquiva").
    const archivedAt =
      existing.status === 'ARCHIVED' && existing.archivedAt
        ? existing.archivedAt
        : (input.archivedAt ?? new Date());

    // Soft delete: nunca apaga o histórico de Recall (log imutável permanece).
    return this.repo.update(input.id, { status: 'ARCHIVED', archivedAt });
  }
}
