import { randomUUID } from 'node:crypto';

import {
  InvalidRecallError,
  StudyItemNotFoundError,
} from '../domain/errors.js';
import {
  type Recall,
  RECALL_CONFIDENCES,
  type RecallConfidence,
} from '../domain/recall.js';
import type { RecallRepository } from './ports/recall-repository.js';
import type { StudyItemRepository } from './ports/study-item-repository.js';

export interface LogRecallInput {
  studyItemId: string;
  userId: string; // dono; senão StudyItemNotFoundError (não vaza)
  confidence: RecallConfidence; // 'A' | 'B' | 'C'
  note?: string | null;
  occurredAt?: Date; // default: now
}

export class LogRecall {
  constructor(
    private items: StudyItemRepository,
    private recalls: RecallRepository,
  ) {}

  async execute(input: LogRecallInput): Promise<Recall> {
    const item = await this.items.byId(input.studyItemId);
    if (!item || item.userId !== input.userId) {
      throw new StudyItemNotFoundError(input.studyItemId);
    }
    if (item.status === 'ARCHIVED') {
      throw new InvalidRecallError('cannot recall an archived item');
    }
    if (!RECALL_CONFIDENCES.includes(input.confidence)) {
      throw new InvalidRecallError(`unknown confidence '${input.confidence}'`);
    }

    const recall: Recall = {
      id: randomUUID(),
      userId: input.userId,
      studyItemId: input.studyItemId,
      confidence: input.confidence,
      note: input.note ?? null,
      occurredAt: input.occurredAt ?? new Date(),
      createdAt: new Date(),
    };

    // O StudyItem não é mutado: consolidação/agendamento são calculados (recall-schedule).
    return this.recalls.save(recall);
  }
}
