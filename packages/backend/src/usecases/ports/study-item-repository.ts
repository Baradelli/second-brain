import type { StudyItem } from '../../domain/study-item.js';

export interface StudyItemFilter {
  userId: string;
  status?: StudyItem['status'];
  resourceId?: string;
  labelId?: string;
}

export interface StudyItemRepository {
  save(item: StudyItem): Promise<StudyItem>;
  byId(id: string): Promise<StudyItem | null>;
  update(id: string, patch: Partial<StudyItem>): Promise<StudyItem>;
  find(filter: StudyItemFilter): Promise<StudyItem[]>;
}
