import { captureResponseSchema } from '@cerebro/shared';
import { z } from 'zod';

import { get, CURRENT_USER_ID } from './client.js';

const journalEntrySchema = z.object({
  done: z.boolean(),
  noteId: z.string().optional(),
});

export const todayAgendaSchema = z.object({
  date: z.string(),
  journal: z.object({
    devotional: journalEntrySchema,
    reflection: journalEntrySchema,
  }),
  capturesToReview: z.array(captureResponseSchema),
});

export type TodayAgenda = z.infer<typeof todayAgendaSchema>;

export function getAgenda(): Promise<TodayAgenda> {
  return get(
    `/agenda?userId=${CURRENT_USER_ID}&day=today`,
    todayAgendaSchema,
  );
}
