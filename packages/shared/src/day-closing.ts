import { z } from 'zod';

export const dayClosingItemSchema = z.object({
  goalId: z.string(),
  title: z.string(),
  type: z.literal('HABIT'),
  kind: z.enum(['scheduled', 'invitation']),
  periodTarget: z.number().optional(),
  periodDone: z.number().optional(),
});
export type DayClosingItemResponse = z.infer<typeof dayClosingItemSchema>;

export const dayClosingResponseSchema = z.object({
  date: z.string(),
  pending: z.array(dayClosingItemSchema),
});
export type DayClosingResponse = z.infer<typeof dayClosingResponseSchema>;
