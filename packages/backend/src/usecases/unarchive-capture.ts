import type { Capture } from '../domain/capture.js';
import { CaptureNotFoundError } from '../domain/errors.js';
import type { CaptureRepository } from './ports/capture-repository.js';

export interface UnarchiveCaptureInput {
  id: string;
  userId: string; // dono; senão CaptureNotFoundError
}

/** Restaura uma captura arquivada: volta para PENDING (fila de revisão) e limpa o arquivamento. */
export class UnarchiveCapture {
  constructor(private repo: CaptureRepository) {}

  async execute(input: UnarchiveCaptureInput): Promise<Capture> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new CaptureNotFoundError(input.id);
    }

    return this.repo.update(input.id, {
      status: 'PENDING',
      archivedAt: null,
      archiveReason: null,
    });
  }
}
