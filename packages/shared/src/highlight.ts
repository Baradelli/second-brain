import { z } from 'zod';

export const createHighlightSchema = z.object({
  userId: z.string().min(1),
  resourceId: z.string().min(1),
  colorId: z.string().min(1),
  quote: z.string().trim().min(1),
  location: z.string().nullish(),
  comment: z.string().nullish(),
});
export type CreateHighlightBody = z.infer<typeof createHighlightSchema>;

export const editHighlightSchema = z.object({
  userId: z.string().min(1), // dono; o UseCase rejeita edição de terceiro
  colorId: z.string().min(1).optional(),
  quote: z.string().trim().min(1).optional(),
  location: z.string().nullish(),
  comment: z.string().nullish(),
});
export type EditHighlightBody = z.infer<typeof editHighlightSchema>;

export const listHighlightsQuerySchema = z.object({
  userId: z.string().min(1),
  resourceId: z.string().min(1),
  colorId: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});
export type ListHighlightsQuery = z.infer<typeof listHighlightsQuerySchema>;

export const highlightResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  resourceId: z.string(),
  colorId: z.string(),
  location: z.string().nullable(),
  quote: z.string(),
  comment: z.string().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type HighlightResponse = z.infer<typeof highlightResponseSchema>;
