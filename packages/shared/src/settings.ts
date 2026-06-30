import { z } from 'zod';

const weekdayNum = z.number().int().min(0).max(6);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const aiMode = z.enum(['cheap', 'connected']);
export type AiModeInput = z.infer<typeof aiMode>;

const hexColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);

export const highlightColorSchema = z.object({
  id: z.string(),
  color: hexColor,
  name: z.string().min(1),
  order: z.number().int(),
});
export type HighlightColorInput = z.infer<typeof highlightColorSchema>;

export const settingsResponseSchema = z.object({
  reviewWeekday: weekdayNum,
  recapWeekday: weekdayNum,
  timezone: z.string().min(1),
  devotionalTime: z.string(),
  reflectionTime: z.string(),
  aiMode,
});
export type SettingsResponse = z.infer<typeof settingsResponseSchema>;

// Paleta de grifos: leitura via GET /settings(.highlightColors); mutação por estes
// schemas em endpoints dedicados (a remoção é bloqueada se a cor estiver em uso).
export const addHighlightColorSchema = z.object({
  color: hexColor,
  name: z.string().trim().min(1),
});
export type AddHighlightColorBody = z.infer<typeof addHighlightColorSchema>;

export const editHighlightColorSchema = z.object({
  color: hexColor.optional(),
  name: z.string().trim().min(1).optional(),
  order: z.number().int().optional(),
});
export type EditHighlightColorBody = z.infer<typeof editHighlightColorSchema>;

export const updateSettingsSchema = z.object({
  reviewWeekday: weekdayNum.optional(),
  recapWeekday: weekdayNum.optional(),
  timezone: z.string().min(1).optional(),
  devotionalTime: hhmm.optional(),
  reflectionTime: hhmm.optional(),
  aiMode: aiMode.optional(),
});
export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>;
