import { z } from 'zod';

import { captureResponseSchema } from './capture.js';
import { noteResponseSchema } from './note.js';
import { resourceResponseSchema } from './resource.js';

export const searchQuerySchema = z.object({
  userId: z.string().min(1),
  q: z.string().trim().min(1),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

/** Resultado da busca simples, agrupado por tipo (notas/recursos/capturas). */
export const searchResultSchema = z.object({
  notes: z.array(noteResponseSchema),
  resources: z.array(resourceResponseSchema),
  captures: z.array(captureResponseSchema),
});
export type SearchResultResponse = z.infer<typeof searchResultSchema>;
