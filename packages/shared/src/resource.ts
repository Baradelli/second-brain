import { z } from 'zod';

export const resourceType = z.enum([
  'book',
  'course',
  'video',
  'article',
  'podcast',
  'other',
]);
export type ResourceTypeInput = z.infer<typeof resourceType>;

export const resourceStage = z.enum(['backlog', 'in_progress', 'done']);
export type ResourceStageInput = z.infer<typeof resourceStage>;

export const createResourceSchema = z.object({
  userId: z.string().min(1),
  title: z.string().trim().min(1),
  type: resourceType,
  url: z.string().url().nullish(),
  author: z.string().nullish(),
  description: z.string().nullish(),
  labelIds: z.array(z.string()).optional(),
});
export type CreateResourceBody = z.infer<typeof createResourceSchema>;

export const editResourceSchema = z.object({
  userId: z.string().min(1), // dono; usado pelo UseCase para rejeitar edição de terceiro
  title: z.string().trim().min(1).optional(),
  type: resourceType.optional(),
  url: z.string().url().nullish(),
  author: z.string().nullish(),
  description: z.string().nullish(),
  stage: resourceStage.optional(),
  labelIds: z.array(z.string()).optional(),
});
export type EditResourceBody = z.infer<typeof editResourceSchema>;

export const listResourcesQuerySchema = z.object({
  userId: z.string().min(1),
  stage: resourceStage.optional(),
  labelId: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});
export type ListResourcesQuery = z.infer<typeof listResourcesQuerySchema>;

export const resourceResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  type: resourceType,
  url: z.string().nullable(),
  author: z.string().nullable(),
  description: z.string().nullable(),
  stage: resourceStage,
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  labelIds: z.array(z.string()),
});
export type ResourceResponse = z.infer<typeof resourceResponseSchema>;
