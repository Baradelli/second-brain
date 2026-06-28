import type {
  CaptureResponse,
  NoteResponse,
  ResourceResponse,
  SearchResultResponse,
} from '@cerebro/shared';

import type { TabDescriptor } from '../tabs/tabs-reducer.js';

/**
 * Mapeamento puro resultado-de-busca → aba, para o quick switcher. Sem React:
 * cada resultado vira um `TabDescriptor` (ou `null` se aquele tipo ainda não tem
 * aba própria, caso em que o switcher o pula). Mantido aqui — fora do componente
 * — para poder testar a regra sem DOM.
 *
 * `fallbackTitle` é o título usado quando uma nota não tem título nem texto.
 */

/** Título visível de uma nota: title, senão a primeira linha do texto, senão o fallback. */
function noteTitle(note: NoteResponse, fallbackTitle: string): string {
  if (note.title?.trim()) return note.title.trim();
  const firstLine = note.plainText.split('\n').find((l) => l.trim());
  return firstLine?.trim() || fallbackTitle;
}

export function noteResultToTab(
  note: NoteResponse,
  fallbackTitle: string,
): TabDescriptor {
  return { kind: 'note', id: note.id, title: noteTitle(note, fallbackTitle) };
}

/**
 * Recurso → aba `resource`. A aba ainda é placeholder (Fase 2), mas o switcher já
 * pode abri-la — forward-compatible. Devolve `null` só se não houver título.
 */
export function resourceResultToTab(
  resource: ResourceResponse,
): TabDescriptor | null {
  const title = resource.title?.trim();
  if (!title) return null;
  return { kind: 'resource', id: resource.id, title };
}

/**
 * Captura → não tem aba própria (vive na fila de revisão). Devolve `null`; o
 * switcher pula. Mantido como função para deixar a regra explícita e testável.
 */
export function captureResultToTab(
  _capture: CaptureResponse,
): TabDescriptor | null {
  return null;
}

/**
 * Achata um `SearchResultResponse` na lista ordenada de abas abríveis (notas,
 * depois recursos; capturas são puladas). Itens sem aba mapeável são descartados.
 */
export function searchResultsToTabs(
  result: SearchResultResponse,
  fallbackTitle: string,
): TabDescriptor[] {
  const tabs: TabDescriptor[] = [];
  for (const note of result.notes) {
    tabs.push(noteResultToTab(note, fallbackTitle));
  }
  for (const resource of result.resources) {
    const tab = resourceResultToTab(resource);
    if (tab) tabs.push(tab);
  }
  for (const capture of result.captures) {
    const tab = captureResultToTab(capture);
    if (tab) tabs.push(tab);
  }
  return tabs;
}
