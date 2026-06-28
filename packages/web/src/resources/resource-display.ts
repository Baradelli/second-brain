import type { ResourceResponse, ResourceStageInput } from '@cerebro/shared';

/**
 * Lógica pura de exibição/transição de recursos (Biblioteca). Sem React aqui —
 * só funções puras testáveis com Vitest, espelhando o ciclo de stage do mobile
 * (LibraryPage.STAGE_CYCLE: backlog → in_progress → done → backlog).
 */

/** Ordem do ciclo de stage, igual ao mobile. */
export const STAGE_CYCLE: ResourceStageInput[] = [
  'backlog',
  'in_progress',
  'done',
];

/** Próximo stage no ciclo (volta a backlog depois de done). */
export function nextStage(current: ResourceStageInput): ResourceStageInput {
  const idx = STAGE_CYCLE.indexOf(current);
  // Se o stage for desconhecido (idx === -1), recomeça do início do ciclo.
  return STAGE_CYCLE[(idx + 1) % STAGE_CYCLE.length] ?? 'backlog';
}

/** Título visível de um recurso: o título, ou um fallback se estiver vazio. */
export function resourceLabel(
  resource: Pick<ResourceResponse, 'title'>,
  fallback: string,
): string {
  return resource.title.trim() || fallback;
}
