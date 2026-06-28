// Filtro/ranking puro do command palette. Sem React — só ordenação de itens por
// uma query de substring, para poder testar com Vitest sem DOM. Não é fuzzy
// completo: casa por substring (case-insensitive) e prioriza matches mais cedo
// no label (prefixo > meio), o suficiente para um palette de ações.

/** Item mínimo que o filtro sabe ordenar (label é o que casa contra a query). */
export interface FilterableItem {
  id: string;
  label: string;
}

/**
 * Filtra e ordena `items` pela `query` (substring, case-insensitive).
 * - Query vazia/só espaços → devolve todos na ordem original.
 * - Sem match → lista vazia.
 * - Com match → ordena por posição do match no label (mais cedo primeiro);
 *   empate mantém a ordem original (sort estável).
 */
export function filterCommands<T extends FilterableItem>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];

  const matched: Array<{ item: T; index: number; position: number }> = [];
  items.forEach((item, index) => {
    const position = item.label.toLowerCase().indexOf(q);
    if (position !== -1) {
      matched.push({ item, index, position });
    }
  });

  matched.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.index - b.index;
  });

  return matched.map((m) => m.item);
}
