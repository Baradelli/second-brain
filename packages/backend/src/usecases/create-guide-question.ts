import { randomUUID } from 'node:crypto';

import { createGuideQuestionSchema } from '@cerebro/shared';

import { LabelNotFoundError } from '../domain/errors.js';
import type { GuideQuestion } from '../domain/guide-question.js';
import type { GuideQuestionRepository } from './ports/guide-question-repository.js';

export class CreateGuideQuestion {
  constructor(
    private repo: GuideQuestionRepository,
    private idGenerator: () => string = randomUUID,
  ) {}

  async execute(rawInput: unknown): Promise<GuideQuestion> {
    const input = createGuideQuestionSchema.parse(rawInput);
    const label = await this.repo.labelById(input.labelId);
    if (!label || label.userId !== input.userId) {
      throw new LabelNotFoundError(input.labelId);
    }

    const question: GuideQuestion = {
      id: this.idGenerator(),
      labelId: input.labelId,
      text: input.text,
      order: input.order,
      active: true,
    };

    return this.repo.save(question);
  }
}
