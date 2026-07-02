import type { Capture } from '../domain/capture.js';
import { CaptureNotFoundError } from '../domain/errors.js';
import type { CaptureRepository } from './ports/capture-repository.js';

export interface ArchiveCaptureInput {
  id: string;
  userId: string;
  reason?: string;
}

export class ArchiveCapture {
  constructor(private repo: CaptureRepository) {}

  async execute(input: ArchiveCaptureInput): Promise<Capture> {
    const capture = await this.repo.byId(input.id);
    // Dono errado = NotFound (não vaza a existência do recurso). Tarefa 77.
    if (!capture || capture.userId !== input.userId)
      throw new CaptureNotFoundError(input.id);

    return this.repo.update(input.id, {
      status: 'ARCHIVED',
      archivedAt: new Date(),
      archiveReason: input.reason ?? null,
    });
  }
}
