import { z } from 'zod';

import { noteScope, noteType } from './note.js';

export const createCaptureSchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1),
  url: z.string().url().optional(),
  reviewAt: z.coerce.date().optional(),
  labelIds: z.array(z.string()).optional(),
});

export type CreateCaptureInput = z.infer<typeof createCaptureSchema>;

export const listCapturesQuerySchema = z.object({
  userId: z.string().min(1),
  status: z.enum(['PENDING', 'ARCHIVED']).default('PENDING'),
});

export type ListCapturesQuery = z.infer<typeof listCapturesQuerySchema>;

export const captureResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  text: z.string(),
  url: z.string().optional(),
  status: z.enum(['PENDING', 'PROCESSED', 'ARCHIVED']),
  reviewAt: z.string().datetime().nullable(),
  processedAt: z.string().datetime().nullable(),
  promotedToType: z.string().nullable(),
  promotedToId: z.string().nullable(),
  archivedAt: z.string().datetime().nullable(),
  archiveReason: z.string().nullable(),
  labelIds: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
});

export type CaptureResponse = z.infer<typeof captureResponseSchema>;

export const archiveCaptureSchema = z.object({
  reason: z.string().optional(),
});

export type ArchiveCaptureInput = z.infer<typeof archiveCaptureSchema>;

export const promoteCaptureSchema = z.object({
  type: noteType,
  scope: noteScope.optional(),
  title: z.string().optional(),
});

export type PromoteCaptureInput = z.infer<typeof promoteCaptureSchema>;
