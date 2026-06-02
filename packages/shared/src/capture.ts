import { z } from 'zod';

export const createCaptureSchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1),
  url: z.string().url().optional(),
  reviewAt: z.coerce.date().optional(),
  labelIds: z.array(z.string()).optional(),
});

export type CreateCaptureInput = z.infer<typeof createCaptureSchema>;
