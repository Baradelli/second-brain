import type { Recall } from '../../domain/recall.js';

export interface RecallFilter {
  userId: string;
  studyItemId?: string;
  studyItemIds?: string[]; // agenda em lote (Tarefa 62)
}

export interface RecallRepository {
  save(recall: Recall): Promise<Recall>;
  byId(id: string): Promise<Recall | null>;
  delete(id: string): Promise<void>; // hard delete (exceção do undo)
  find(filter: RecallFilter): Promise<Recall[]>; // usado para calcular a escada
}
