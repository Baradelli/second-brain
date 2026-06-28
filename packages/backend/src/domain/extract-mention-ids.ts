/**
 * Source of backlinks/graph: dado o doc JSON (TipTap/ProseMirror) de uma nota,
 * coleta os ids de cada nó de menção a outra nota.
 *
 * Uma menção é `{ type: 'mention', attrs: { id: '<noteId>', label: '...' } }`
 * (ver `packages/ui/src/components/note-mention.ts`). O alvo do link é `attrs.id`.
 *
 * Puro e defensivo: anda o doc recursivamente, deduplica (preservando a ordem de
 * primeira aparição) e descarta ids vazios/ausentes/não-string. Não conhece o id da
 * própria nota — descartar auto-referência é responsabilidade de quem chama (UseCase),
 * que é quem sabe o `fromNoteId`.
 */
interface DocNode {
  type?: string;
  attrs?: { id?: unknown } | null;
  content?: unknown;
}

function walk(value: unknown, into: string[]): void {
  if (value === null || typeof value !== 'object') return;

  const node = value as DocNode;

  if (node.type === 'mention') {
    const id = node.attrs?.id;
    if (typeof id === 'string' && id.length > 0 && !into.includes(id)) {
      into.push(id);
    }
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) walk(child, into);
  }
}

export function extractMentionIds(doc: unknown): string[] {
  const ids: string[] = [];
  walk(doc, ids);
  return ids;
}
