import {
  type AttachmentResponse,
  attachmentResponseSchema,
  type CaptureResponse,
  captureResponseSchema,
  type LabelNodeResponse,
  labelNodeResponseSchema,
  type NoteResponse,
  noteResponseSchema,
  type NoteType,
  type ResourceResponse,
  resourceResponseSchema,
  type ResourceStageInput,
  type ResourceTypeInput,
  type SuggestedQuestionsGroupResponse,
  suggestedQuestionsGroupResponseSchema,
  uploadResponseSchema,
} from '@cerebro/shared';
import { z } from 'zod';

import { CURRENT_USER_ID, get, patch, post, postFile } from './client.js';

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

// ── Captures ──────────────────────────────────────────────────────────────────

const promoteCaptureResponseSchema = z.object({
  note: noteResponseSchema,
  capture: captureResponseSchema,
});

export function createCapture(text: string): Promise<CaptureResponse> {
  return post(
    '/captures',
    { text, userId: CURRENT_USER_ID },
    captureResponseSchema,
  );
}

export function listCaptures(
  status: 'PENDING' | 'ARCHIVED',
): Promise<CaptureResponse[]> {
  return get(
    `/captures?userId=${CURRENT_USER_ID}&status=${status}`,
    z.array(captureResponseSchema),
  );
}

export function archiveCapture(
  id: string,
  reason?: string,
): Promise<CaptureResponse> {
  return post(`/captures/${id}/archive`, { reason }, captureResponseSchema);
}

export function promoteCaptureToNote(
  id: string,
  type: NoteType,
): Promise<{ note: NoteResponse; capture: CaptureResponse }> {
  return post(
    `/captures/${id}/promote`,
    { type },
    promoteCaptureResponseSchema,
  );
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

// ── Suggested questions ───────────────────────────────────────────────────────

export function getSuggestedQuestions(
  labelIds: string[],
): Promise<SuggestedQuestionsGroupResponse[]> {
  if (labelIds.length === 0) return Promise.resolve([]);
  const query = labelIds.map(encodeURIComponent).join(',');
  return get(
    `/notes/suggested-questions?labelIds=${query}`,
    z.array(suggestedQuestionsGroupResponseSchema),
  );
}

// ── Attachments ───────────────────────────────────────────────────────────────

/**
 * Faz upload do arquivo para o disco do servidor e devolve a URL pública.
 * Essa URL é então gravada no Attachment via {@link attachFileToNote}.
 */
export function uploadAttachmentFile(file: File): Promise<string> {
  return postFile('/uploads', file, uploadResponseSchema).then((r) => r.url);
}

export function attachFileToNote(
  noteId: string,
  file: {
    url: string;
    type: string;
    mimeType?: string;
    name?: string;
    size?: number;
  },
): Promise<AttachmentResponse> {
  return post(
    `/notes/${noteId}/attachments`,
    { ...file, userId: CURRENT_USER_ID, noteId },
    attachmentResponseSchema,
  );
}

export function getNoteAttachments(
  noteId: string,
): Promise<AttachmentResponse[]> {
  return get(`/notes/${noteId}/attachments`, z.array(attachmentResponseSchema));
}

// ── Resources (Biblioteca) ──────────────────────────────────────────────────

export interface ListResourcesParams {
  stage?: ResourceStageInput;
  labelId?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
}

export function listResources(
  params: ListResourcesParams = {},
): Promise<ResourceResponse[]> {
  const query = new URLSearchParams({ userId: CURRENT_USER_ID });
  if (params.stage) query.set('stage', params.stage);
  if (params.labelId) query.set('labelId', params.labelId);
  query.set('status', params.status ?? 'ACTIVE');
  return get(`/resources?${query.toString()}`, z.array(resourceResponseSchema));
}

export interface CreateResourceBody {
  title: string;
  type: ResourceTypeInput;
  url?: string | null;
  author?: string | null;
  description?: string | null;
  labelIds?: string[];
}

export function createResource(
  body: CreateResourceBody,
): Promise<ResourceResponse> {
  return post(
    '/resources',
    { ...body, userId: CURRENT_USER_ID },
    resourceResponseSchema,
  );
}

export function editResource(
  id: string,
  body: Partial<CreateResourceBody> & { stage?: ResourceStageInput },
): Promise<ResourceResponse> {
  return patch(
    `/resources/${id}`,
    { ...body, userId: CURRENT_USER_ID },
    resourceResponseSchema,
  );
}

// ── Labels ──────────────────────────────────────────────────────────────────

export function listLabels(): Promise<LabelNodeResponse[]> {
  return get(
    `/labels?userId=${CURRENT_USER_ID}`,
    z.array(labelNodeResponseSchema),
  );
}

/** Achata a árvore de labels para uma lista plana (id + name), p/ filtros simples. */
export function flattenLabels(
  nodes: LabelNodeResponse[],
): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  const walk = (list: LabelNodeResponse[]) => {
    for (const n of list) {
      out.push({ id: n.id, name: n.name });
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export async function getTodayNote(
  type: NoteType,
): Promise<NoteResponse | null> {
  const now = new Date();
  const dayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
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
