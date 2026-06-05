import { z } from 'zod';

export const checkGoalSchema = z.object({
  userId: z.string().min(1),
  value: z.number().positive().nullish(),
  occurredAt: z.coerce.date().optional(),
});
export type CheckGoalBody = z.infer<typeof checkGoalSchema>;

export const skipGoalSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().min(1),
  occurredAt: z.coerce.date().optional(),
});
export type SkipGoalBody = z.infer<typeof skipGoalSchema>;

export const undoCheckSchema = z.object({
  userId: z.string().min(1),
});
export type UndoCheckBody = z.infer<typeof undoCheckSchema>;

export const eventResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  goalId: z.string(),
  type: z.enum(['done', 'skip']),
  value: z.number().nullable(),
  reason: z.string().nullable(),
  occurredAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type EventResponse = z.infer<typeof eventResponseSchema>;
