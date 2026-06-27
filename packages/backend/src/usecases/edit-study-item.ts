import {
  InvalidStudyItemError,
  StudyItemNotFoundError,
} from '../domain/errors.js';
import {
  normalizeQuestions,
  type StudyItem,
  type StudyQuestions,
} from '../domain/study-item.js';
import type { StudyItemRepository } from './ports/study-item-repository.js';

export interface EditStudyItemInput {
  id: string;
  userId: string; // owner; editing another user's item is rejected as not-found
  title?: string;
  resourceId?: string | null;
  reference?: string | null;
  questions?: Partial<StudyQuestions> | null;
  fichamentoNoteId?: string | null;
  labelIds?: string[]; // if present, REPLACES the current set
}

export class EditStudyItem {
  constructor(private repo: StudyItemRepository) {}

  async execute(input: EditStudyItemInput): Promise<StudyItem> {
    const existing = await this.repo.byId(input.id);
    // not-found also covers wrong owner: never leak existence across users
    if (!existing || existing.userId !== input.userId) {
      throw new StudyItemNotFoundError(input.id);
    }

    const patch: Partial<StudyItem> = {};

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (title.length === 0) {
        throw new InvalidStudyItemError('title must not be empty');
      }
      patch.title = title;
    }
    if (input.reference !== undefined) patch.reference = input.reference;
    if (input.resourceId !== undefined) patch.resourceId = input.resourceId;
    if (input.fichamentoNoteId !== undefined)
      patch.fichamentoNoteId = input.fichamentoNoteId;
    if (input.questions !== undefined)
      patch.questions = normalizeQuestions(input.questions);
    if (input.labelIds !== undefined) patch.labelIds = input.labelIds;

    // status/archivedAt/createdAt are intentionally never touched here (archive is separate).

    return this.repo.update(input.id, patch);
  }
}
