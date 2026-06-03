import type {
  GuideQuestion,
  GuideQuestionLabel,
} from '../../domain/guide-question.js';

export interface GuideQuestionWithLabel {
  label: GuideQuestionLabel;
  question: GuideQuestion;
}

export interface GuideQuestionRepository {
  labelById(id: string): Promise<GuideQuestionLabel | null>;
  save(question: GuideQuestion): Promise<GuideQuestion>;
  byId(id: string): Promise<GuideQuestion | null>;
  update(id: string, patch: Partial<GuideQuestion>): Promise<GuideQuestion>;
  findActiveByLabelIds(labelIds: string[]): Promise<GuideQuestionWithLabel[]>;
}
