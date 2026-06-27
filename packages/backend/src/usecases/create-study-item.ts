import { randomUUID } from 'node:crypto';

import { InvalidStudyItemError } from '../domain/errors.js';
import {
  normalizeQuestions,
  type StudyItem,
  type StudyQuestions,
} from '../domain/study-item.js';
import type { StudyItemRepository } from './ports/study-item-repository.js';

export interface CreateStudyItemInput {
  userId: string;
  title: string;
  resourceId?: string | null;
  reference?: string | null;
  questions?: Partial<StudyQuestions> | null;
  fichamentoNoteId?: string | null;
  labelIds?: string[];
}

export class CreateStudyItem {
  constructor(private repo: StudyItemRepository) {}

  async execute(input: CreateStudyItemInput): Promise<StudyItem> {
    const title = input.title?.trim() ?? '';
    if (title.length === 0) {
      throw new InvalidStudyItemError('title must not be empty');
    }

    const item: StudyItem = {
      id: randomUUID(),
      userId: input.userId,
      resourceId: input.resourceId ?? null,
      title,
      reference: input.reference ?? null,
      questions: normalizeQuestions(input.questions),
      fichamentoNoteId: input.fichamentoNoteId ?? null,
      status: 'ACTIVE',
      archivedAt: null,
      createdAt: new Date(),
      labelIds: input.labelIds ?? [],
    };

    return this.repo.save(item);
  }
}
