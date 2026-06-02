import type { Capture } from '../domain/capture.js';
import type { CaptureRepository } from './ports/capture-repository.js';

export interface ListArchivedInput {
  userId: string;
}

export class ListArchived {
  constructor(private repo: CaptureRepository) {}

  async execute(input: ListArchivedInput): Promise<Capture[]> {
    const captures = await this.repo.find({ userId: input.userId, status: 'ARCHIVED' });
    return captures.sort((a, b) => {
      const aTime = a.archivedAt?.getTime() ?? 0;
      const bTime = b.archivedAt?.getTime() ?? 0;
      return bTime - aTime;
    });
  }
}
