import {
  type ArchivedGoalResponse,
  archivedGoalSchema,
  type AttachmentResponse,
  attachmentResponseSchema,
  type CalendarDayDetailResponse,
  calendarDayDetailResponseSchema,
  type CalendarMonthResponse,
  calendarMonthResponseSchema,
  type CaptureResponse,
  captureResponseSchema,
  type DayClosingResponse,
  dayClosingResponseSchema,
  type EventResponse,
  eventResponseSchema,
  type GoalPeriodInput,
  type GoalProgressResponse,
  goalProgressResponseSchema,
  type GoalResponse,
  goalResponseSchema,
  type GoalTypeInput,
  type LabelNodeResponse,
  labelNodeResponseSchema,
  type LabelResponse,
  labelResponseSchema,
  type LoginResponse,
  loginResponseSchema,
  type NoteResponse,
  noteResponseSchema,
  type NoteType,
  type RecapScope,
  type ResourceResponse,
  resourceResponseSchema,
  type ResourceStageInput,
  type ResourceTypeInput,
  type SearchResultResponse,
  searchResultSchema,
  type SuggestedQuestionsGroupResponse,
  suggestedQuestionsGroupResponseSchema,
  uploadResponseSchema,
} from '@cerebro/shared';
import { z } from 'zod';

import { del, get, patch, post, postFile } from './client.js';

// ── Auth ────────────────────────────────────────────────────────────────────

export function login(email: string, password: string): Promise<LoginResponse> {
  return post('/auth/login', { email, password }, loginResponseSchema);
}

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
  return get(`/agenda?day=today`, todayAgendaSchema);
}

// ── Captures ──────────────────────────────────────────────────────────────────

const promoteResultSchema = z.union([
  z.object({ note: noteResponseSchema, capture: captureResponseSchema }),
  z.object({
    resource: resourceResponseSchema,
    capture: captureResponseSchema,
  }),
  z.object({ goal: goalResponseSchema, capture: captureResponseSchema }),
]);

export type PromoteCaptureBody =
  | { destination: 'note'; type: NoteType; scope?: string; title?: string }
  | {
      destination: 'resource';
      type: ResourceTypeInput;
      title?: string;
      url?: string | null;
      author?: string | null;
      description?: string | null;
    }
  | {
      destination: 'goal';
      type: GoalTypeInput;
      title?: string;
      description?: string | null;
      targetValue?: number | null;
      unit?: string | null;
      period?: GoalPeriodInput | null;
      timesPerPeriod?: number | null;
      weekdays?: number[];
      parentId?: string | null;
    };

export type PromoteCaptureResult = z.infer<typeof promoteResultSchema>;

export function createCapture(text: string): Promise<CaptureResponse> {
  return post('/captures', { text }, captureResponseSchema);
}

export function listCaptures(
  status: 'PENDING' | 'ARCHIVED',
): Promise<CaptureResponse[]> {
  return get(
    `/captures?status=${status}`,
    z.array(captureResponseSchema),
  );
}

export function archiveCapture(
  id: string,
  reason?: string,
): Promise<CaptureResponse> {
  return post(`/captures/${id}/archive`, { reason }, captureResponseSchema);
}

export function promoteCapture(
  id: string,
  body: PromoteCaptureBody,
): Promise<PromoteCaptureResult> {
  return post(`/captures/${id}/promote`, body, promoteResultSchema);
}

/** Atalho retrocompatível para o destino note (usado pela tela de captura). */
export function promoteCaptureToNote(
  id: string,
  type: NoteType,
): Promise<{ note: NoteResponse; capture: CaptureResponse }> {
  return promoteCapture(id, { destination: 'note', type }) as Promise<{
    note: NoteResponse;
    capture: CaptureResponse;
  }>;
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function createNote(body: {
  type: NoteType;
  doc: Record<string, unknown>;
  title?: string;
  scope?: string;
  date?: string;
  resourceId?: string;
}): Promise<NoteResponse> {
  return post(
    '/notes',
    {
      ...body,
      scope: body.scope ?? 'DAY',
      date: body.date ?? new Date().toISOString(),
    },
    noteResponseSchema,
  );
}

export function editNote(
  id: string,
  body: { doc?: Record<string, unknown>; title?: string; labelIds?: string[] },
): Promise<NoteResponse> {
  return patch(`/notes/${id}`, body, noteResponseSchema);
}

export function getNoteById(id: string): Promise<NoteResponse> {
  return get(`/notes/${id}`, noteResponseSchema);
}

/** Soft delete: arquiva a nota (sai da lista ACTIVE). */
export function archiveNote(id: string): Promise<NoteResponse> {
  return post(`/notes/${id}/archive`, {}, noteResponseSchema);
}

export function listNotes(
  params: {
    type?: NoteType;
    scope?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
    status?: 'ACTIVE' | 'ARCHIVED';
    resourceId?: string;
  } = {},
): Promise<NoteResponse[]> {
  const query = new URLSearchParams();
  query.set('status', params.status ?? 'ACTIVE');
  if (params.type) query.set('type', params.type);
  if (params.scope) query.set('scope', params.scope);
  if (params.resourceId) query.set('resourceId', params.resourceId);
  return get(`/notes?${query.toString()}`, z.array(noteResponseSchema));
}

/** Acha-ou-cria o recap (nota journal com escopo de período) do período atual. */
export function createRecap(
  type: 'DEVOTIONAL' | 'REFLECTION',
  scope: RecapScope,
): Promise<NoteResponse> {
  return post('/recaps', { type, scope }, noteResponseSchema);
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
    { ...file, noteId },
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
  const query = new URLSearchParams();
  if (params.stage) query.set('stage', params.stage);
  if (params.labelId) query.set('labelId', params.labelId);
  query.set('status', params.status ?? 'ACTIVE');
  return get(`/resources?${query.toString()}`, z.array(resourceResponseSchema));
}

export function getResource(id: string): Promise<ResourceResponse> {
  return get(`/resources/${id}`, resourceResponseSchema);
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
  return post('/resources', body, resourceResponseSchema);
}

export function editResource(
  id: string,
  body: Partial<CreateResourceBody> & { stage?: ResourceStageInput },
): Promise<ResourceResponse> {
  return patch(`/resources/${id}`, body, resourceResponseSchema);
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export function listActiveGoals(
  params: { type?: GoalTypeInput; parentId?: string } = {},
): Promise<GoalResponse[]> {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.parentId) query.set('parentId', params.parentId);
  const qs = query.toString();
  return get(`/goals${qs ? `?${qs}` : ''}`, z.array(goalResponseSchema));
}

export interface CreateGoalBody {
  title: string;
  type: GoalTypeInput;
  description?: string | null;
  targetValue?: number | null;
  unit?: string | null;
  period?: GoalPeriodInput | null;
  timesPerPeriod?: number | null;
  weekdays?: number[];
  parentId?: string | null;
  labelIds?: string[];
}

export function createGoal(body: CreateGoalBody): Promise<GoalResponse> {
  return post('/goals', body, goalResponseSchema);
}

export interface EditGoalBody {
  title?: string;
  description?: string | null;
  targetValue?: number | null;
  unit?: string | null;
  period?: GoalPeriodInput | null;
  timesPerPeriod?: number | null;
  weekdays?: number[];
  labelIds?: string[];
}

export function editGoal(
  id: string,
  body: EditGoalBody,
): Promise<GoalResponse> {
  return patch(`/goals/${id}`, body, goalResponseSchema);
}

export function archiveGoal(id: string): Promise<GoalResponse> {
  return post(`/goals/${id}/archive`, {}, goalResponseSchema);
}

export function unarchiveGoal(id: string): Promise<GoalResponse> {
  return post(`/goals/${id}/unarchive`, {}, goalResponseSchema);
}

/** Hard delete — só objetivos arquivados que nunca foram feitos (backend valida). */
export function deleteGoal(id: string): Promise<GoalResponse> {
  return post(`/goals/${id}/delete`, {}, goalResponseSchema);
}

export function listArchivedGoals(): Promise<ArchivedGoalResponse[]> {
  return get(`/goals/archived`, z.array(archivedGoalSchema));
}

export function getGoalProgress(id: string): Promise<GoalProgressResponse> {
  return get(`/goals/${id}/progress`, goalProgressResponseSchema);
}

export function checkGoal(
  id: string,
  body: { value?: number } = {},
): Promise<EventResponse> {
  return post(`/goals/${id}/check`, body, eventResponseSchema);
}

/** Desfaz um check (hard delete do evento) — usado para desmarcar uma meta marcada por engano. */
export function undoCheck(eventId: string): Promise<void> {
  return del(`/events/${eventId}`, {});
}

export function completeGoal(id: string): Promise<GoalResponse> {
  return post(`/goals/${id}/complete`, {}, goalResponseSchema);
}

export function skipGoal(id: string, reason: string): Promise<EventResponse> {
  return post(`/goals/${id}/skip`, { reason }, eventResponseSchema);
}

// ── Fechar o dia ────────────────────────────────────────────────────────────

export function getDayClosing(): Promise<DayClosingResponse> {
  return get(`/day-closing?day=today`, dayClosingResponseSchema);
}

// ── Calendário ──────────────────────────────────────────────────────────────

/** Agregado mensal: por dia, metas previstas × cumpridas + selo de diário. */
export function getCalendar(month?: string): Promise<CalendarMonthResponse> {
  const query = new URLSearchParams();
  if (month) query.set('month', month);
  const qs = query.toString();
  return get(
    `/calendar${qs ? `?${qs}` : ''}`,
    calendarMonthResponseSchema,
  );
}

/** Detalhe de um dia: metas (com status) + notas escritas no dia. */
export function getDayDetail(date: string): Promise<CalendarDayDetailResponse> {
  const query = new URLSearchParams({ date });
  return get(`/calendar/day?${query.toString()}`, calendarDayDetailResponseSchema);
}

// ── Busca ─────────────────────────────────────────────────────────────────────

/** Busca simples por texto em notas/recursos/capturas. */
export function getSearch(q: string): Promise<SearchResultResponse> {
  const query = new URLSearchParams({ q });
  return get(`/search?${query.toString()}`, searchResultSchema);
}

// ── Labels ──────────────────────────────────────────────────────────────────

export function listLabels(): Promise<LabelNodeResponse[]> {
  return get(`/labels`, z.array(labelNodeResponseSchema));
}

export interface LabelBody {
  name: string;
  color?: string | null;
  parentId?: string | null;
}

export function createLabel(body: LabelBody): Promise<LabelResponse> {
  return post('/labels', body, labelResponseSchema);
}

export function editLabel(id: string, body: LabelBody): Promise<LabelResponse> {
  return patch(`/labels/${id}`, body, labelResponseSchema);
}

export function archiveLabel(id: string): Promise<LabelResponse> {
  return post(`/labels/${id}/archive`, {}, labelResponseSchema);
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
    `/notes?type=${type}&scope=DAY&from=${encodeURIComponent(dayStart)}&to=${encodeURIComponent(dayEnd)}&status=ACTIVE`,
    z.array(noteResponseSchema),
  );

  return notes[0] ?? null;
}
