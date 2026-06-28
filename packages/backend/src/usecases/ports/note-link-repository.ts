import type { NoteLink } from '../../domain/note-link.js';

/** Uma aresta nua do grafo: origem → destino (sem metadados). */
export interface NoteLinkEdge {
  fromNoteId: string;
  toNoteId: string;
}

export interface NoteLinkRepository {
  /**
   * Substitui o conjunto de links de SAÍDA da nota `fromNoteId`: apaga os atuais e insere
   * `toNoteIds` (idempotente). Chamado pelo create/edit de nota com os ids de menção do doc.
   */
  replaceOutgoing(
    userId: string,
    fromNoteId: string,
    toNoteIds: string[],
  ): Promise<void>;

  /** Links que apontam PARA `noteId` (backlinks): retorna o id da nota de origem. */
  listBacklinks(userId: string, noteId: string): Promise<NoteLink[]>;

  /** Todas as arestas do usuário (para montar o grafo global). */
  listGraphEdges(userId: string): Promise<NoteLinkEdge[]>;
}
