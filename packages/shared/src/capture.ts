import { z } from 'zod';

import { weekday } from './common.js';
import { goalPeriod, goalType } from './goal.js';
import { noteScope, noteType } from './note.js';
import { resourceType } from './resource.js';

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

// Edição de captura PENDENTE (Tarefa 78): corrigir texto/url/labels antes de
// promover/arquivar. Capturas processadas/arquivadas não se editam.
export const editCaptureBodySchema = z.object({
  text: z.string().min(1).optional(),
  url: z.string().url().nullish(),
  labelIds: z.array(z.string()).optional(),
});

export type EditCaptureBody = z.infer<typeof editCaptureBodySchema>;

export const archiveCaptureSchema = z.object({
  reason: z.string().optional(),
});

export type ArchiveCaptureInput = z.infer<typeof archiveCaptureSchema>;

// Promoção de captura discriminada por destino (note | resource | goal).
export const promoteCaptureSchema = z.discriminatedUnion('destination', [
  z.object({
    destination: z.literal('note'),
    type: noteType,
    scope: noteScope.optional(),
    title: z.string().optional(),
  }),
  z.object({
    destination: z.literal('resource'),
    title: z.string().optional(),
    type: resourceType,
    url: z.string().url().nullish(),
    author: z.string().nullish(),
    description: z.string().nullish(),
  }),
  z.object({
    destination: z.literal('goal'),
    title: z.string().optional(),
    type: goalType,
    description: z.string().nullish(),
    targetValue: z.number().positive().nullish(),
    unit: z.string().nullish(),
    period: goalPeriod.nullish(),
    timesPerPeriod: z.number().int().positive().nullish(),
    weekdays: z.array(weekday).optional(),
    startAt: z.coerce.date().nullish(),
    dueAt: z.coerce.date().nullish(),
    parentId: z.string().nullish(),
  }),
]);

export type PromoteCaptureInput = z.infer<typeof promoteCaptureSchema>;
