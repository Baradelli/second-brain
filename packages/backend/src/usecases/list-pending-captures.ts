import type { Capture } from '../domain/capture.js';
import { dayRange } from '../domain/day-range.js';
import type { CaptureRepository } from './ports/capture-repository.js';

export interface ListPendingCapturesInput {
  userId: string;
  reference: Date;
  timezone: string;
}

export class ListPendingCaptures {
  constructor(private repo: CaptureRepository) {}

  async execute(input: ListPendingCapturesInput): Promise<Capture[]> {
    const { to: endOfDay } = dayRange(input.reference, input.timezone, 'DAY');

    // Load all PENDING for this user, then filter in the use case:
    // - reviewAt <= end of today → due now
    // - reviewAt === null → no date set, always show for review
    const all = await this.repo.find({ userId: input.userId, status: 'PENDING' });
    return all.filter(c => c.reviewAt === null || c.reviewAt <= endOfDay);
  }
}
