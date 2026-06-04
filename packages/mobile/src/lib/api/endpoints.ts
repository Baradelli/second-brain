import {
  captureResponseSchema,
  noteResponseSchema,
  type NoteResponse,
  type NoteType,
} from '@cerebro/shared';
import { z } from 'zod';

import { get, patch, post, CURRENT_USER_ID } from './client.js';

// ── Agenda ────────────────────────────────────────────────────────────────────

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
  return get(`/agenda?userId=${CURRENT_USER_ID}&day=today`, todayAgendaSchema);
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function createNote(body: {
  type: NoteType;
  doc: Record<string, unknown>;
  title?: string;
  scope?: string;
  date?: string;
}): Promise<NoteResponse> {
  return post(
    '/notes',
    {
      ...body,
      userId: CURRENT_USER_ID,
      scope: body.scope ?? 'DAY',
      date: body.date ?? new Date().toISOString(),
    },
    noteResponseSchema,
  );
}

export function editNote(
  id: string,
  body: { doc?: Record<string, unknown>; title?: string },
): Promise<NoteResponse> {
  return patch(`/notes/${id}`, body, noteResponseSchema);
}

export function getNoteById(id: string): Promise<NoteResponse> {
  return get(`/notes/${id}`, noteResponseSchema);
}

export async function getTodayNote(type: NoteType): Promise<NoteResponse | null> {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  ).toISOString();

  const notes = await get(
    `/notes?userId=${CURRENT_USER_ID}&type=${type}&scope=DAY&from=${encodeURIComponent(dayStart)}&to=${encodeURIComponent(dayEnd)}&status=ACTIVE`,
    z.array(noteResponseSchema),
  );

  return notes[0] ?? null;
}
