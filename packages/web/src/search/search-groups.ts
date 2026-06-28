import type { SearchResultResponse } from '@cerebro/shared';

import {
  captureResultToTab,
  noteResultToTab,
  resourceResultToTab,
} from '../shell/search-to-tab.js';
import type { TabDescriptor } from '../tabs/tabs-reducer.js';

/**
 * Lógica pura da aba Busca: agrupa um `SearchResultResponse` em seções por tipo
 * (notas / biblioteca / capturas), como a SearchPage do mobile, MAS reusa os
 * mapeadores puros de `search-to-tab.ts` para decidir o título e se cada linha
 * abre uma aba (`tab`) ou não (capturas → `null`). Assim a aba Busca e o quick
 * switcher (Cmd+O) concordam: a mesma regra produz os dois.
 *
 * Sem React/DOM aqui — só transformação de dados, testável com Vitest.
 */

/** Uma linha exibível no resultado. `tab` é null quando o item não tem aba própria. */
export interface SearchRow {
  id: string;
  title: string;
  tab: TabDescriptor | null;
}

/** As seções da busca, sempre nesta ordem. */
export interface SearchGroups {
  notes: SearchRow[];
  resources: SearchRow[];
  captures: SearchRow[];
  /** Total de linhas em todas as seções — atalho para o estado "nada encontrado". */
  total: number;
}

/**
 * Achata o resultado em grupos exibíveis. `fallbackTitle` é o título usado quando
 * uma nota não tem título nem texto (mesmo fallback do switcher).
 */
export function searchResultsToGroups(
  result: SearchResultResponse,
  fallbackTitle: string,
): SearchGroups {
  const notes: SearchRow[] = result.notes.map((note) => {
    const tab = noteResultToTab(note, fallbackTitle);
    return { id: note.id, title: tab.title, tab };
  });

  const resources: SearchRow[] = result.resources.map((resource) => {
    const tab = resourceResultToTab(resource);
    return { id: resource.id, title: tab?.title ?? resource.title, tab };
  });

  const captures: SearchRow[] = result.captures.map((capture) => ({
    id: capture.id,
    title: capture.text,
    tab: captureResultToTab(capture),
  }));

  return {
    notes,
    resources,
    captures,
    total: notes.length + resources.length + captures.length,
  };
}
