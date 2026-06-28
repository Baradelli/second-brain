// Lógica pura da triagem: a partir do resultado da promoção (união discriminada
// vinda do backend), decide se devemos abrir uma aba de acompanhamento e qual.
// Sem React aqui — assim dá para testar com Vitest sem DOM, e o "para onde vou
// depois de promover" mora num lugar só (espelha o switch de navegação do mobile,
// mas em termos de abas do desktop).

import type { PromoteCaptureResult } from '@cerebro/shared/client';

import type { TabDescriptor } from '../tabs/tabs-reducer.js';

/**
 * Decide a aba a abrir após promover uma captura.
 *
 * - `note`   → abre a aba da nota (ela se auto-titula via rename quando carrega).
 * - `resource`/`goal` → ainda não têm aba própria no desktop (Fase 2); por ora
 *   não abrimos nada — a lista de revisão só se atualiza. Devolve `null`.
 *
 * O título passado para a aba da nota é provisório; o `NoteEditorTab` renomeia a
 * aba assim que o conteúdo carrega.
 */
export function tabForPromoteResult(
  result: PromoteCaptureResult,
  noteFallbackTitle: string,
): TabDescriptor | null {
  if ('note' in result) {
    return {
      kind: 'note',
      id: result.note.id,
      title: result.note.title?.trim() || noteFallbackTitle,
    };
  }
  // resource | goal: sem destino de aba por enquanto.
  return null;
}
