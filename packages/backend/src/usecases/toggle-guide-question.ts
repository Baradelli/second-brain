import { toggleGuideQuestionSchema } from '@cerebro/shared';

import { GuideQuestionNotFoundError } from '../domain/errors.js';
import type { GuideQuestion } from '../domain/guide-question.js';
import type { GuideQuestionRepository } from './ports/guide-question-repository.js';

export class ToggleGuideQuestion {
  constructor(private repo: GuideQuestionRepository) {}

  async execute(input: {
    id: string;
    userId: string;
    active: unknown;
  }): Promise<GuideQuestion> {
    const data = toggleGuideQuestionSchema.parse({ active: input.active });
    const existing = await this.repo.byId(input.id);
    if (!existing) throw new GuideQuestionNotFoundError(input.id);

    // A pergunta pertence a quem é dono do label dela (mesmo padrão do create).
    // Dono errado = NotFound (não vaza a existência). Tarefa 77.
    const label = await this.repo.labelById(existing.labelId);
    if (!label || label.userId !== input.userId)
      throw new GuideQuestionNotFoundError(input.id);

    return this.repo.update(input.id, { active: data.active });
  }
}
