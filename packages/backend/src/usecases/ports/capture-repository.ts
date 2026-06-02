import type { Capture } from '../../domain/capture.js';

export interface CaptureFilter {
  userId: string;
  status?: 'PENDING' | 'PROCESSED' | 'ARCHIVED';
  reviewUntil?: Date; // returns captures where reviewAt <= reviewUntil
}

export interface CaptureRepository {
  save(capture: Capture): Promise<Capture>;
  byId(id: string): Promise<Capture | null>;
  find(filter: CaptureFilter): Promise<Capture[]>;
  update(id: string, patch: Partial<Capture>): Promise<Capture>;
}
