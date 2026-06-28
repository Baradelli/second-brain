/**
 * NoteLink — aresta materializada do grafo de notas (Fase 4.1). Representa que a nota
 * `fromNoteId` menciona a nota `toNoteId`. Recomputado/persistido a cada save da nota de
 * origem (ver ADR docs/adr/0001-note-link-materialized.md).
 */
export interface NoteLink {
  id: string;
  userId: string;
  fromNoteId: string;
  toNoteId: string;
  createdAt: Date;
}
