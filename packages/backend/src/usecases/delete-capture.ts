import type { Capture } from '../domain/capture.js';
import {
  CaptureHasReferencesError,
  CaptureNotArchivedError,
  CaptureNotFoundError,
} from '../domain/errors.js';
import type { AttachmentRepository } from './ports/attachment-repository.js';
import type { CaptureRepository } from './ports/capture-repository.js';

export interface DeleteCaptureInput {
  id: string;
  userId: string; // dono; senão CaptureNotFoundError (não vaza)
}

/**
 * Hard delete de uma captura arquivada. Bloqueado se houver anexos.
 * Ver docs/adr/0004-politica-de-exclusao.md.
 */
export class DeleteCapture {
  constructor(
    private captures: CaptureRepository,
    private attachments: AttachmentRepository,
  ) {}

  async execute(input: DeleteCaptureInput): Promise<Capture> {
    const existing = await this.captures.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new CaptureNotFoundError(input.id);
    }

    if (existing.status !== 'ARCHIVED') {
      throw new CaptureNotArchivedError(input.id);
    }

    const attachments = await this.attachments.listByCapture(input.id);
    if (attachments.length > 0) {
      throw new CaptureHasReferencesError(attachments.length);
    }

    await this.captures.delete(input.id);
    return existing;
  }
}
