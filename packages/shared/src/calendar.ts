import { z } from 'zod';

import { noteType } from './note.js';

/**
 * Calendário mensal — agregado por dia: metas previstas × cumpridas + selo de diário.
 * Só navegação/visualização (streaks/aderência são MVP 3).
 */
export const calendarDaySchema = z.object({
  date: z.string(), // 'YYYY-MM-DD' (dia local)
  goalsPlanned: z.number().int().nonnegative(),
  goalsDone: z.number().int().nonnegative(),
  journal: z.object({
    devotional: z.boolean(),
    reflection: z.boolean(),
  }),
});
export type CalendarDayResponse = z.infer<typeof calendarDaySchema>;

export const calendarMonthResponseSchema = z.object({
  month: z.string(), // 'YYYY-MM'
  days: z.array(calendarDaySchema),
});
export type CalendarMonthResponse = z.infer<typeof calendarMonthResponseSchema>;

export const calendarQuerySchema = z.object({
  userId: z.string().min(1),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(), // ausente → mês corrente
});
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;

// ── Detalhe de um dia ─────────────────────────────────────────────────────────

export const calendarDayGoalSchema = z.object({
  goalId: z.string(),
  title: z.string(),
  kind: z.enum(['scheduled', 'invitation']),
  status: z.enum(['done', 'skipped', 'pending']),
});
export type CalendarDayGoalResponse = z.infer<typeof calendarDayGoalSchema>;

export const calendarDayNoteSchema = z.object({
  id: z.string(),
  type: noteType,
  title: z.string().optional(),
});
export type CalendarDayNoteResponse = z.infer<typeof calendarDayNoteSchema>;

export const calendarDayDetailResponseSchema = z.object({
  date: z.string(), // 'YYYY-MM-DD'
  goals: z.array(calendarDayGoalSchema),
  notes: z.array(calendarDayNoteSchema),
});
export type CalendarDayDetailResponse = z.infer<
  typeof calendarDayDetailResponseSchema
>;

export const calendarDayQuerySchema = z.object({
  userId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type CalendarDayQuery = z.infer<typeof calendarDayQuerySchema>;
