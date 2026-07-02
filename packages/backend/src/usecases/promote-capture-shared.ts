import type { Capture } from '../domain/capture.js';
import {
  CaptureAlreadyProcessedError,
  CaptureNotFoundError,
} from '../domain/errors.js';
import type { CaptureRepository } from './ports/capture-repository.js';

export type PromoteDestination = 'note' | 'resource' | 'goal';

/**
 * Carrega a captura do DONO e garante que ainda está PENDING (senão lança).
 * Dono errado = NotFound (não vaza a existência). Tarefa 77.
 */
export async function loadPendingCapture(
  repo: CaptureRepository,
  captureId: string,
  userId: string,
): Promise<Capture> {
  const capture = await repo.byId(captureId);
  if (!capture || capture.userId !== userId)
    throw new CaptureNotFoundError(captureId);
  if (capture.status !== 'PENDING')
    throw new CaptureAlreadyProcessedError(captureId);
  return capture;
}

/** Marca a captura como PROCESSED apontando para a entidade criada. */
export async function markPromoted(
  repo: CaptureRepository,
  captureId: string,
  destination: PromoteDestination,
  promotedToId: string,
): Promise<Capture> {
  return repo.update(captureId, {
    status: 'PROCESSED',
    processedAt: new Date(),
    promotedToType: destination,
    promotedToId,
  });
}
