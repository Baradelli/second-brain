import type { Capture } from '../domain/capture.js';
import {
  CaptureAlreadyProcessedError,
  CaptureNotFoundError,
} from '../domain/errors.js';
import type { CaptureRepository } from './ports/capture-repository.js';

export interface EditCaptureInput {
  id: string;
  userId: string;
  text?: string;
  url?: string | null;
  labelIds?: string[];
}

/**
 * Edita uma captura AINDA PENDENTE (corrigir o texto antes de promover/arquivar).
 * Capturas processadas/arquivadas são história — não se reescrevem (Tarefa 78).
 */
export class EditCapture {
  constructor(private repo: CaptureRepository) {}

  async execute(input: EditCaptureInput): Promise<Capture> {
    const capture = await this.repo.byId(input.id);
    // Dono errado = NotFound (não vaza a existência). Tarefa 77.
    if (!capture || capture.userId !== input.userId)
      throw new CaptureNotFoundError(input.id);
    if (capture.status !== 'PENDING')
      throw new CaptureAlreadyProcessedError(input.id);

    const patch: Partial<Capture> = {};
    if (input.text !== undefined) patch.text = input.text;
    if (input.url !== undefined) patch.url = input.url ?? undefined;
    if (input.labelIds !== undefined) patch.labelIds = input.labelIds;

    return this.repo.update(input.id, patch);
  }
}
