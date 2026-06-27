import { RecallNotFoundError } from '../domain/errors.js';
import type { RecallRepository } from './ports/recall-repository.js';

export interface UndoRecallInput {
  recallId: string;
  userId: string; // dono; senão RecallNotFoundError
}

export class UndoRecall {
  constructor(private recalls: RecallRepository) {}

  async execute(input: UndoRecallInput): Promise<void> {
    const recall = await this.recalls.byId(input.recallId);
    if (!recall || recall.userId !== input.userId) {
      throw new RecallNotFoundError(input.recallId);
    }

    // Hard delete — única exceção ao "Recall é log imutável" (mesma decisão do Event/undoCheck).
    await this.recalls.delete(input.recallId);
  }
}
