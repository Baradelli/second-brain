import type {
  GuideQuestion,
  SuggestedQuestionsGroup,
} from '../domain/guide-question.js';
import type { GuideQuestionRepository } from './ports/guide-question-repository.js';

export class SuggestedQuestionsForNote {
  constructor(private repo: GuideQuestionRepository) {}

  async execute(input: {
    labelIds: string[];
  }): Promise<SuggestedQuestionsGroup[]> {
    const rows = await this.repo.findActiveByLabelIds(input.labelIds);
    const groups = new Map<string, SuggestedQuestionsGroup>();

    for (const row of rows) {
      const group = groups.get(row.label.id) ?? {
        label: { id: row.label.id, name: row.label.name },
        questions: [] as GuideQuestion[],
      };
      group.questions.push(row.question);
      groups.set(row.label.id, group);
    }

    return input.labelIds
      .map((labelId) => groups.get(labelId))
      .filter((group): group is SuggestedQuestionsGroup => group !== undefined)
      .map((group) => ({
        ...group,
        questions: [...group.questions].sort((a, b) => a.order - b.order),
      }));
  }
}
