import type {
  GuideQuestion,
  GuideQuestionLabel,
} from '../../domain/guide-question.js';
import type {
  GuideQuestionRepository,
  GuideQuestionWithLabel,
} from '../ports/guide-question-repository.js';

export class GuideQuestionRepositoryFake implements GuideQuestionRepository {
  private labels = new Map<string, GuideQuestionLabel>();
  private questions = new Map<string, GuideQuestion>();

  get saved(): GuideQuestion[] {
    return Array.from(this.questions.values());
  }

  addLabel(label: GuideQuestionLabel) {
    this.labels.set(label.id, { ...label });
  }

  async labelById(id: string): Promise<GuideQuestionLabel | null> {
    return this.labels.get(id) ?? null;
  }

  async save(question: GuideQuestion): Promise<GuideQuestion> {
    this.questions.set(question.id, { ...question });
    return question;
  }

  async byId(id: string): Promise<GuideQuestion | null> {
    return this.questions.get(id) ?? null;
  }

  async update(
    id: string,
    patch: Partial<GuideQuestion>,
  ): Promise<GuideQuestion> {
    const existing = this.questions.get(id);
    if (!existing) throw new Error(`GuideQuestion not found: ${id}`);
    const updated = { ...existing, ...patch };
    this.questions.set(id, updated);
    return updated;
  }

  async findActiveByLabelIds(
    labelIds: string[],
  ): Promise<GuideQuestionWithLabel[]> {
    const requested = new Set(labelIds);
    return Array.from(this.questions.values())
      .filter((question) => requested.has(question.labelId) && question.active)
      .map((question) => {
        const label = this.labels.get(question.labelId);
        if (!label) return null;
        return { label, question };
      })
      .filter((item): item is GuideQuestionWithLabel => item !== null);
  }
}
