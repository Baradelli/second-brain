import { z } from 'zod';

/**
 * Note — tudo que se escreve no editor (TipTap): devocional, reflexão, fichamento, nota.
 * A diferença entre eles é apenas `type` / `scope`, não a estrutura.
 *
 * NOTA: `Event.type` e `Goal.type` ficarão como string validada por z.enum (ainda evoluem);
 * aqui, NoteType e NoteScope são fechados, então viram enum no Prisma.
 */
export const noteType = z.enum(['DEVOTIONAL', 'REFLECTION', 'STUDY_NOTE', 'NOTE']);
export type NoteType = z.infer<typeof noteType>;

export const noteScope = z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']);
export type NoteScope = z.infer<typeof noteScope>;

/**
 * Input para criar uma Note. O `doc` é o JSON do TipTap (estrutura ProseMirror);
 * mantemos como `unknown` aqui e validamos o formato na borda quando necessário.
 * O `plainText` NÃO entra no input — é derivado do `doc` pelo domínio.
 */
export const createNoteSchema = z.object({
  userId: z.string().min(1),
  type: noteType,
  scope: noteScope.default('DAY'),
  date: z.coerce.date(),
  title: z.string().optional(),
  doc: z.unknown(),
  goalId: z.string().optional(),
  resourceId: z.string().optional(),
  eventId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const listNotesQuerySchema = z.object({
  userId: z.string().min(1),
  type: noteType.optional(),
  scope: noteScope.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;

export const noteResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: noteType,
  scope: noteScope,
  date: z.string().datetime(),
  title: z.string().optional(),
  doc: z.record(z.unknown()),
  plainText: z.string(),
  goalId: z.string().optional(),
  resourceId: z.string().optional(),
  eventId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  archivedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

export type NoteResponse = z.infer<typeof noteResponseSchema>;
