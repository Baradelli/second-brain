import { z } from 'zod';

export const studyItemStatus = z.enum(['ACTIVE', 'ARCHIVED', 'CONSOLIDATED']);
export type StudyItemStatusInput = z.infer<typeof studyItemStatus>;

export const recallConfidence = z.enum(['A', 'B', 'C']);
export type RecallConfidenceInput = z.infer<typeof recallConfidence>;

export const studyQuestionsSchema = z.object({
  before: z.array(z.string()).default([]),
  during: z.array(z.string()).default([]),
  after: z.array(z.string()).default([]),
});
export type StudyQuestionsInput = z.infer<typeof studyQuestionsSchema>;

const studyQuestionsPartial = studyQuestionsSchema.partial();

export const createStudyItemSchema = z.object({
  userId: z.string().min(1),
  title: z.string().trim().min(1),
  resourceId: z.string().nullish(),
  reference: z.string().nullish(),
  questions: studyQuestionsPartial.nullish(),
  fichamentoNoteId: z.string().nullish(),
  labelIds: z.array(z.string()).optional(),
});
export type CreateStudyItemBody = z.infer<typeof createStudyItemSchema>;

export const editStudyItemSchema = z.object({
  userId: z.string().min(1), // dono; usado pelo UseCase para rejeitar edição de terceiro
  title: z.string().trim().min(1).optional(),
  resourceId: z.string().nullish(),
  reference: z.string().nullish(),
  questions: studyQuestionsPartial.nullish(),
  fichamentoNoteId: z.string().nullish(),
  labelIds: z.array(z.string()).optional(),
});
export type EditStudyItemBody = z.infer<typeof editStudyItemSchema>;

export const listStudyItemsQuerySchema = z.object({
  userId: z.string().min(1),
  status: studyItemStatus.default('ACTIVE'),
  resourceId: z.string().optional(),
  labelId: z.string().optional(),
});
export type ListStudyItemsQuery = z.infer<typeof listStudyItemsQuerySchema>;

export const logRecallSchema = z.object({
  userId: z.string().min(1),
  confidence: recallConfidence,
  note: z.string().nullish(),
  occurredAt: z.coerce.date().optional(),
});
export type LogRecallBody = z.infer<typeof logRecallSchema>;

export const recallScheduleResponseSchema = z.object({
  index: z.number().int(),
  consolidated: z.boolean(),
  nextRecallAt: z.string().datetime().nullable(),
  dueToday: z.boolean(),
  overdue: z.boolean(),
});
export type RecallScheduleResponse = z.infer<
  typeof recallScheduleResponseSchema
>;

export const studyItemResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  resourceId: z.string().nullable(),
  title: z.string(),
  reference: z.string().nullable(),
  questions: studyQuestionsSchema.nullable(),
  fichamentoNoteId: z.string().nullable(),
  status: studyItemStatus,
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  labelIds: z.array(z.string()),
  schedule: recallScheduleResponseSchema,
});
export type StudyItemResponse = z.infer<typeof studyItemResponseSchema>;

export const recallResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  studyItemId: z.string(),
  confidence: recallConfidence,
  note: z.string().nullable(),
  occurredAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type RecallResponse = z.infer<typeof recallResponseSchema>;
