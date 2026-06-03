import { toggleGuideQuestionSchema } from '@cerebro/shared';

import { GuideQuestionNotFoundError } from '../domain/errors.js';
import type { GuideQuestion } from '../domain/guide-question.js';
import type { GuideQuestionRepository } from './ports/guide-question-repository.js';

export class ToggleGuideQuestion {
  constructor(private repo: GuideQuestionRepository) {}

  async execute(input: {
    id: string;
    active: unknown;
  }): Promise<GuideQuestion> {
    const data = toggleGuideQuestionSchema.parse({ active: input.active });
    const existing = await this.repo.byId(input.id);
    if (!existing) throw new GuideQuestionNotFoundError(input.id);

    return this.repo.update(input.id, { active: data.active });
  }
}
