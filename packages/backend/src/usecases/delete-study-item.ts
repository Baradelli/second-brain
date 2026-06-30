import {
  StudyItemHasHistoryError,
  StudyItemNotArchivedError,
  StudyItemNotFoundError,
} from '../domain/errors.js';
import type { StudyItem } from '../domain/study-item.js';
import type { RecallRepository } from './ports/recall-repository.js';
import type { StudyItemRepository } from './ports/study-item-repository.js';

export interface DeleteStudyItemInput {
  id: string;
  userId: string; // dono; senão StudyItemNotFoundError (não vaza)
}

/**
 * Hard delete de um item de estudo arquivado. Bloqueado se houver histórico de
 * Recall (log imutável de revisões). Ver docs/adr/0004-politica-de-exclusao.md.
 */
export class DeleteStudyItem {
  constructor(
    private items: StudyItemRepository,
    private recalls: RecallRepository,
  ) {}

  async execute(input: DeleteStudyItemInput): Promise<StudyItem> {
    const existing = await this.items.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new StudyItemNotFoundError(input.id);
    }

    if (existing.status !== 'ARCHIVED') {
      throw new StudyItemNotArchivedError(input.id);
    }

    const history = await this.recalls.find({
      userId: input.userId,
      studyItemId: input.id,
    });
    if (history.length > 0) {
      throw new StudyItemHasHistoryError(history.length);
    }

    await this.items.delete(input.id);
    return existing;
  }
}
