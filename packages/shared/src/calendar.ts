import { z } from 'zod';

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
