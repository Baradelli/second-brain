export type RecallConfidence = 'A' | 'B' | 'C'; // A=sei explicar, B=reconheço, C=não sei

export const RECALL_CONFIDENCES: readonly RecallConfidence[] = ['A', 'B', 'C'];

export interface Recall {
  id: string;
  userId: string;
  studyItemId: string;
  confidence: RecallConfidence;
  note: string | null;
  occurredAt: Date; // instante UTC; "o dia" é calculado no timezone do Settings
  createdAt: Date;
}
