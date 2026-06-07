import { z } from 'zod';

const weekdayNum = z.number().int().min(0).max(6);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const settingsResponseSchema = z.object({
  reviewWeekday: weekdayNum,
  recapWeekday: weekdayNum,
  timezone: z.string().min(1),
  devotionalTime: z.string(),
  reflectionTime: z.string(),
});
export type SettingsResponse = z.infer<typeof settingsResponseSchema>;

export const updateSettingsSchema = z.object({
  reviewWeekday: weekdayNum.optional(),
  recapWeekday: weekdayNum.optional(),
  timezone: z.string().min(1).optional(),
  devotionalTime: hhmm.optional(),
  reflectionTime: hhmm.optional(),
});
export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>;
