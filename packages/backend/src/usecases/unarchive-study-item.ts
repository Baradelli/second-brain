import { StudyItemNotFoundError } from '../domain/errors.js';
import type { StudyItem } from '../domain/study-item.js';
import type { StudyItemRepository } from './ports/study-item-repository.js';

export interface UnarchiveStudyItemInput {
  id: string;
  userId: string; // dono; senão StudyItemNotFoundError
}

/** Restaura um item de estudo arquivado: volta a ACTIVE e limpa `archivedAt`. Idempotente. */
export class UnarchiveStudyItem {
  constructor(private repo: StudyItemRepository) {}

  async execute(input: UnarchiveStudyItemInput): Promise<StudyItem> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new StudyItemNotFoundError(input.id);
    }

    return this.repo.update(input.id, { status: 'ACTIVE', archivedAt: null });
  }
}
