import { z } from 'zod';

import { noteType } from './note.js';

/**
 * Backlinks/grafo de notas (Fase 4.1). As notas se referenciam por menções `@` no doc
 * TipTap; o backend materializa esses links (ver ADR 0001) e os expõe aqui.
 */

/** Uma nota de origem que aponta para a nota consultada (backlink): id + título. */
export const backlinkResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
});
export type BacklinkResponse = z.infer<typeof backlinkResponseSchema>;

/** Nó do grafo: uma nota (id, título, tipo). */
export const noteGraphNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: noteType,
});
export type NoteGraphNode = z.infer<typeof noteGraphNodeSchema>;

/** Aresta do grafo: nota de origem → nota de destino. */
export const noteGraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
});
export type NoteGraphEdge = z.infer<typeof noteGraphEdgeSchema>;

export const noteGraphResponseSchema = z.object({
  nodes: z.array(noteGraphNodeSchema),
  edges: z.array(noteGraphEdgeSchema),
});
export type NoteGraphResponse = z.infer<typeof noteGraphResponseSchema>;
