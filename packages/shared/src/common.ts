import { z } from 'zod';

/** Horário no formato HH:mm (00:00–23:59). Usado por Settings. */
export const timeHHmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato esperado: HH:mm (00:00–23:59)');

/** Dia da semana: 0 = domingo ... 6 = sábado. */
export const weekday = z.number().int().min(0).max(6);
