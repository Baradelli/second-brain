import type { NoteType } from '@cerebro/shared';

import type { NoteLinkRepository } from './ports/note-link-repository.js';
import type { NoteRepository } from './ports/note-repository.js';

export interface BuildNoteGraphInput {
  userId: string;
}

export interface NoteGraphNode {
  id: string;
  title: string;
  type: NoteType;
}

export interface NoteGraphEdge {
  from: string;
  to: string;
}

export interface NoteGraph {
  nodes: NoteGraphNode[];
  edges: NoteGraphEdge[];
}

/**
 * Grafo global das notas do usuário. Nós = notas ATIVAS (id, título, tipo); arestas =
 * links nota→nota. Faz join com os nós para que links pendentes (alvo/origem inexistente,
 * arquivado ou de outro usuário) não apareçam como arestas.
 */
export class BuildNoteGraph {
  constructor(
    private notes: NoteRepository,
    private links: NoteLinkRepository,
  ) {}

  async execute(input: BuildNoteGraphInput): Promise<NoteGraph> {
    const [activeNotes, edges] = await Promise.all([
      this.notes.find({ userId: input.userId, status: 'ACTIVE' }),
      this.links.listGraphEdges(input.userId),
    ]);

    const nodes: NoteGraphNode[] = activeNotes.map((n) => ({
      id: n.id,
      title: n.title ?? '',
      type: n.type,
    }));
    const nodeIds = new Set(nodes.map((n) => n.id));

    const graphEdges = edges
      .filter((e) => nodeIds.has(e.fromNoteId) && nodeIds.has(e.toNoteId))
      .map((e) => ({ from: e.fromNoteId, to: e.toNoteId }));

    return { nodes, edges: graphEdges };
  }
}
