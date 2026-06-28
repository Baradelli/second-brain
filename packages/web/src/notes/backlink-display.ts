import type { BacklinkResponse } from '@cerebro/shared';

/**
 * Título exibível de um backlink. O backend já reduz a nota de origem a um
 * título (1ª linha não vazia), mas ele pode vir vazio (nota sem título ainda);
 * nesse caso caímos no fallback `notes.untitled`. Lógica pura para testar a
 * regra do vazio sem montar o painel.
 */
export function backlinkDisplayTitle(
  backlink: Pick<BacklinkResponse, 'title'>,
  fallback: string,
): string {
  const trimmed = backlink.title.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}
