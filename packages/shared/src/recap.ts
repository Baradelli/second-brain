import { z } from 'zod';

/** Recap = nota journal (DEVOTIONAL/REFLECTION) com escopo de período. */
export const recapScope = z.enum(['WEEK', 'MONTH', 'YEAR']);
export type RecapScope = z.infer<typeof recapScope>;

export const createRecapSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['DEVOTIONAL', 'REFLECTION']),
  scope: recapScope,
});
export type CreateRecapBody = z.infer<typeof createRecapSchema>;
