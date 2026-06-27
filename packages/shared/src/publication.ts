import { z } from 'zod';

export const publicationFormat = z.enum([
  'linkedin',
  'substack',
  'blog',
  'lesson',
  'video',
]);
export type PublicationFormatInput = z.infer<typeof publicationFormat>;

export const publicationStage = z.enum(['idea', 'draft', 'published']);
export type PublicationStageInput = z.infer<typeof publicationStage>;

export const publicationSourceType = z.enum([
  'study_item',
  'note',
  'resource',
  'recap',
]);
export type PublicationSourceTypeInput = z.infer<typeof publicationSourceType>;

export const createPublicationSchema = z.object({
  userId: z.string().min(1),
  sourceType: publicationSourceType,
  sourceId: z.string().trim().min(1),
  format: publicationFormat,
  title: z.string().trim().min(1),
  noteId: z.string().nullish(),
  labelIds: z.array(z.string()).optional(),
});
export type CreatePublicationBody = z.infer<typeof createPublicationSchema>;

export const editPublicationSchema = z.object({
  userId: z.string().min(1), // dono; usado pelo UseCase para rejeitar edição de terceiro
  title: z.string().trim().min(1).optional(),
  format: publicationFormat.optional(),
  stage: publicationStage.optional(),
  noteId: z.string().nullish(),
  labelIds: z.array(z.string()).optional(),
});
export type EditPublicationBody = z.infer<typeof editPublicationSchema>;

export const listPublicationsQuerySchema = z.object({
  userId: z.string().min(1),
  stage: publicationStage.optional(),
  format: publicationFormat.optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});
export type ListPublicationsQuery = z.infer<typeof listPublicationsQuerySchema>;

export const publicationResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  sourceType: publicationSourceType,
  sourceId: z.string(),
  format: publicationFormat,
  stage: publicationStage,
  title: z.string(),
  noteId: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  labelIds: z.array(z.string()),
});
export type PublicationResponse = z.infer<typeof publicationResponseSchema>;
