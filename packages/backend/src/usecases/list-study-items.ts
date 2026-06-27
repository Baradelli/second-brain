import type { StudyItem } from '../domain/study-item.js';
import type {
  StudyItemFilter,
  StudyItemRepository,
} from './ports/study-item-repository.js';

export type ListStudyItemsInput = StudyItemFilter;

export class ListStudyItems {
  constructor(private repo: StudyItemRepository) {}

  async execute(input: ListStudyItemsInput): Promise<StudyItem[]> {
    return this.repo.find(input);
  }
}
