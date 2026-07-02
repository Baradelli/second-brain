import { z } from 'zod';

import {
  type AiRunRequest,
  type AiRunResponse,
  aiRunResponseSchema,
  type ArchivedGoalResponse,
  archivedGoalSchema,
  type AttachmentResponse,
  attachmentResponseSchema,
  type BacklinkResponse,
  backlinkResponseSchema,
  type CalendarDayDetailResponse,
  calendarDayDetailResponseSchema,
  type CalendarMonthResponse,
  calendarMonthResponseSchema,
  type CaptureResponse,
  captureResponseSchema,
  type CreateStudyItemBody,
  type DayClosingResponse,
  dayClosingResponseSchema,
  type EditStudyItemBody,
  type EventResponse,
  eventResponseSchema,
  type GoalPeriodInput,
  type GoalProgressResponse,
  goalProgressResponseSchema,
  type GoalResponse,
  goalResponseSchema,
  type GoalTypeInput,
  type AddHighlightColorBody,
  type CreateHighlightBody,
  type EditHighlightBody,
  type EditHighlightColorBody,
  type HighlightColorInput,
  highlightColorSchema,
  type HighlightResponse,
  highlightResponseSchema,
  type LabelNodeResponse,
  labelNodeResponseSchema,
  type LabelResponse,
  labelResponseSchema,
  type LoginResponse,
  loginResponseSchema,
  type LogRecallBody,
  type NoteGraphResponse,
  noteGraphResponseSchema,
  type NoteResponse,
  noteResponseSchema,
  type NoteType,
  type PublicationFormatInput,
  type PublicationResponse,
  publicationResponseSchema,
  type PublicationSourceTypeInput,
  type PublicationStageInput,
  type RecallResponse,
  recallResponseSchema,
  type RecapScope,
  type ResourceResponse,
  resourceResponseSchema,
  type ResourceStageInput,
  type ResourceTypeInput,
  type SearchResultResponse,
  searchResultSchema,
  type SettingsResponse,
  settingsResponseSchema,
  type StudyItemResponse,
  studyItemResponseSchema,
  type StudyItemStatusInput,
  type SuggestedQuestionsGroupResponse,
  suggestedQuestionsGroupResponseSchema,
  type UpdateSettingsBody,
  uploadResponseSchema,
} from '../index.js';
import { isAuthenticated, setToken } from './auth.js';
import { del, get, patch, post, postFile } from './client.js';

// ── Auth ────────────────────────────────────────────────────────────────────

export function login(email: string, password: string): Promise<LoginResponse> {
  return post('/auth/login', { email, password }, loginResponseSchema);
}

/** Troca um token ainda válido por um novo de 15 dias (Tarefa 76). */
export function refreshSession(): Promise<LoginResponse> {
  return post('/auth/refresh', {}, loginResponseSchema);
}

/**
 * Renovação deslizante no boot do app: se há token salvo, troca por um novo.
 * O 401 (token vencido) já desloga pelo client; erro de rede fica quieto —
 * o token atual continua valendo até a próxima abertura.
 */
export function renewSessionOnBoot(): void {
  if (!isAuthenticated()) return;
  refreshSession()
    .then((r) => setToken(r.token))
    .catch(() => {});
}

// ── Agenda ────────────────────────────────────────────────────────────────────

const journalEntrySchema = z.object({
  done: z.boolean(),
  noteId: z.string().optional(),
});

const agendaRecallSchema = z.object({
  studyItemId: z.string(),
  title: z.string(),
  dueToday: z.boolean(),
  overdue: z.boolean(),
  nextRecallAt: z.string().nullable(),
});

const agendaGoalSchema = z.object({
  goalId: z.string(),
  title: z.string(),
  kind: z.enum(['scheduled', 'invitation']),
  resolvedToday: z.boolean(),
});

export type AgendaGoal = z.infer<typeof agendaGoalSchema>;

export const todayAgendaSchema = z.object({
  date: z.string(),
  journal: z.object({
    devotional: journalEntrySchema,
    reflection: journalEntrySchema,
  }),
  capturesToReview: z.array(captureResponseSchema),
  goals: z.array(agendaGoalSchema).default([]),
  recallsDue: z.array(agendaRecallSchema).default([]),
});

export type TodayAgenda = z.infer<typeof todayAgendaSchema>;

export function getAgenda(): Promise<TodayAgenda> {
  return get(`/agenda?day=today`, todayAgendaSchema);
}

// ── Study items / Recalls (Leitura Retentiva) ───────────────────────────────

export type CreateStudyItemInput = Omit<CreateStudyItemBody, 'userId'>;
export type EditStudyItemInput = Omit<EditStudyItemBody, 'userId'>;
export type LogRecallInput = Omit<LogRecallBody, 'userId'>;

export function createStudyItem(
  body: CreateStudyItemInput,
): Promise<StudyItemResponse> {
  return post('/study-items', body, studyItemResponseSchema);
}

export function listStudyItems(params?: {
  status?: StudyItemStatusInput;
  resourceId?: string;
  labelId?: string;
}): Promise<StudyItemResponse[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.resourceId) qs.set('resourceId', params.resourceId);
  if (params?.labelId) qs.set('labelId', params.labelId);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return get(`/study-items${suffix}`, z.array(studyItemResponseSchema));
}

export function getStudyItem(id: string): Promise<StudyItemResponse> {
  return get(`/study-items/${id}`, studyItemResponseSchema);
}

export function editStudyItem(
  id: string,
  body: EditStudyItemInput,
): Promise<StudyItemResponse> {
  return patch(`/study-items/${id}`, body, studyItemResponseSchema);
}

export function archiveStudyItem(id: string): Promise<StudyItemResponse> {
  return post(`/study-items/${id}/archive`, {}, studyItemResponseSchema);
}

/** Restaura um item de estudo arquivado (volta para ACTIVE). */
export function unarchiveStudyItem(id: string): Promise<StudyItemResponse> {
  return post(`/study-items/${id}/unarchive`, {}, studyItemResponseSchema);
}

/** Hard delete — só itens arquivados e sem histórico de recall (409 se bloqueado). */
export function deleteStudyItem(id: string): Promise<StudyItemResponse> {
  return post(`/study-items/${id}/delete`, {}, studyItemResponseSchema);
}

export function logRecall(
  studyItemId: string,
  body: LogRecallInput,
): Promise<RecallResponse> {
  return post(
    `/study-items/${studyItemId}/recalls`,
    body,
    recallResponseSchema,
  );
}

export function undoRecall(recallId: string): Promise<void> {
  return del(`/recalls/${recallId}`);
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
  return get(`/captures?status=${status}`, z.array(captureResponseSchema));
}

export function archiveCapture(
  id: string,
  reason?: string,
): Promise<CaptureResponse> {
  return post(`/captures/${id}/archive`, { reason }, captureResponseSchema);
}

/** Restaura uma captura arquivada (volta para a fila de revisão). */
export function unarchiveCapture(id: string): Promise<CaptureResponse> {
  return post(`/captures/${id}/unarchive`, {}, captureResponseSchema);
}

/** Hard delete — só capturas arquivadas e sem anexos (backend valida; 409 se bloqueado). */
export function deleteCapture(id: string): Promise<CaptureResponse> {
  return post(`/captures/${id}/delete`, {}, captureResponseSchema);
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

/** Restaura uma nota arquivada (volta para ACTIVE). */
export function unarchiveNote(id: string): Promise<NoteResponse> {
  return post(`/notes/${id}/unarchive`, {}, noteResponseSchema);
}

/** Hard delete — só notas arquivadas e sem referências (backend valida; 409 se bloqueado). */
export function deleteNote(id: string): Promise<NoteResponse> {
  return post(`/notes/${id}/delete`, {}, noteResponseSchema);
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

/** Publicações que nasceram deste recurso (diretas + de itens de estudo/notas). */
export function listResourcePublications(
  resourceId: string,
): Promise<PublicationResponse[]> {
  return get(
    `/resources/${resourceId}/publications`,
    z.array(publicationResponseSchema),
  );
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

/** Soft delete: arquiva o recurso (sai da lista ACTIVE). */
export function archiveResource(id: string): Promise<ResourceResponse> {
  return post(`/resources/${id}/archive`, {}, resourceResponseSchema);
}

/** Restaura um recurso arquivado (volta para ACTIVE). */
export function unarchiveResource(id: string): Promise<ResourceResponse> {
  return post(`/resources/${id}/unarchive`, {}, resourceResponseSchema);
}

/** Hard delete — só recursos arquivados e sem referências (409 se bloqueado). */
export function deleteResource(id: string): Promise<ResourceResponse> {
  return post(`/resources/${id}/delete`, {}, resourceResponseSchema);
}

// ── Highlights (Grifos) ───────────────────────────────────────────────────────

export type CreateHighlightInput = Omit<CreateHighlightBody, 'userId'>;
export type EditHighlightInput = Omit<EditHighlightBody, 'userId'>;

export function listHighlights(params: {
  resourceId: string;
  colorId?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
}): Promise<HighlightResponse[]> {
  const query = new URLSearchParams();
  query.set('resourceId', params.resourceId);
  if (params.colorId) query.set('colorId', params.colorId);
  query.set('status', params.status ?? 'ACTIVE');
  return get(`/highlights?${query.toString()}`, z.array(highlightResponseSchema));
}

export function getHighlight(id: string): Promise<HighlightResponse> {
  return get(`/highlights/${id}`, highlightResponseSchema);
}

export function createHighlight(
  body: CreateHighlightInput,
): Promise<HighlightResponse> {
  return post('/highlights', body, highlightResponseSchema);
}

export function editHighlight(
  id: string,
  body: EditHighlightInput,
): Promise<HighlightResponse> {
  return patch(`/highlights/${id}`, body, highlightResponseSchema);
}

/** Soft delete: arquiva o grifo (sai da lista ACTIVE). */
export function archiveHighlight(id: string): Promise<HighlightResponse> {
  return post(`/highlights/${id}/archive`, {}, highlightResponseSchema);
}

/** Restaura um grifo arquivado (volta para ACTIVE). */
export function unarchiveHighlight(id: string): Promise<HighlightResponse> {
  return post(`/highlights/${id}/unarchive`, {}, highlightResponseSchema);
}

/** Hard delete — só grifos arquivados. */
export function deleteHighlight(id: string): Promise<HighlightResponse> {
  return post(`/highlights/${id}/delete`, {}, highlightResponseSchema);
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export function listActiveGoals(
  params: { type?: GoalTypeInput; parentId?: string; resourceId?: string } = {},
): Promise<GoalResponse[]> {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.parentId) query.set('parentId', params.parentId);
  if (params.resourceId) query.set('resourceId', params.resourceId);
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
  resourceId?: string | null;
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
  resourceId?: string | null;
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
  return get(`/calendar${qs ? `?${qs}` : ''}`, calendarMonthResponseSchema);
}

/** Detalhe de um dia: metas (com status) + notas escritas no dia. */
export function getDayDetail(date: string): Promise<CalendarDayDetailResponse> {
  const query = new URLSearchParams({ date });
  return get(
    `/calendar/day?${query.toString()}`,
    calendarDayDetailResponseSchema,
  );
}

// ── Busca ─────────────────────────────────────────────────────────────────────

/** Busca simples por texto em notas/recursos/capturas. */
export function getSearch(q: string): Promise<SearchResultResponse> {
  const query = new URLSearchParams({ q });
  return get(`/search?${query.toString()}`, searchResultSchema);
}

// ── Configurações ─────────────────────────────────────────────────────────────

export function getSettings(): Promise<SettingsResponse> {
  return get('/settings', settingsResponseSchema);
}

export function updateSettings(
  body: UpdateSettingsBody,
): Promise<SettingsResponse> {
  return patch('/settings', body, settingsResponseSchema);
}

// ── Paleta de grifos (cores de marca-texto) ───────────────────────────────────

export function listHighlightColors(): Promise<HighlightColorInput[]> {
  return get('/settings/highlight-colors', z.array(highlightColorSchema));
}

export function addHighlightColor(
  body: AddHighlightColorBody,
): Promise<HighlightColorInput> {
  return post('/settings/highlight-colors', body, highlightColorSchema);
}

export function editHighlightColor(
  id: string,
  body: EditHighlightColorBody,
): Promise<HighlightColorInput> {
  return patch(`/settings/highlight-colors/${id}`, body, highlightColorSchema);
}

/** Remove uma cor da paleta. 409 se algum grifo ainda a usa. */
export function removeHighlightColor(id: string): Promise<void> {
  return del(`/settings/highlight-colors/${id}`);
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

/** Lista labels arquivadas (árvore). */
export function listArchivedLabels(): Promise<LabelNodeResponse[]> {
  return get(`/labels?status=ARCHIVED`, z.array(labelNodeResponseSchema));
}

/** Restaura uma label arquivada (volta para ACTIVE). */
export function unarchiveLabel(id: string): Promise<LabelResponse> {
  return post(`/labels/${id}/unarchive`, {}, labelResponseSchema);
}

/** Hard delete — só labels arquivadas e sem uso/filhas (409 se bloqueado). */
export function deleteLabel(id: string): Promise<LabelResponse> {
  return post(`/labels/${id}/delete`, {}, labelResponseSchema);
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

// ── Backlinks / Grafo de notas ────────────────────────────────────────────────

/** Notas que mencionam (apontam para) a nota informada. */
export function getBacklinks(noteId: string): Promise<BacklinkResponse[]> {
  return get(`/notes/${noteId}/backlinks`, z.array(backlinkResponseSchema));
}

/** Grafo global: nós (notas) + arestas (links nota→nota) do usuário. */
export function getNoteGraph(): Promise<NoteGraphResponse> {
  return get('/graph', noteGraphResponseSchema);
}

// ── Publications (Ensinar para Reter) ────────────────────────────────────────

export interface ListPublicationsParams {
  stage?: PublicationStageInput;
  format?: PublicationFormatInput;
  status?: 'ACTIVE' | 'ARCHIVED';
}

export function listPublications(
  params: ListPublicationsParams = {},
): Promise<PublicationResponse[]> {
  const query = new URLSearchParams();
  if (params.stage) query.set('stage', params.stage);
  if (params.format) query.set('format', params.format);
  query.set('status', params.status ?? 'ACTIVE');
  return get(
    `/publications?${query.toString()}`,
    z.array(publicationResponseSchema),
  );
}

export function getPublication(id: string): Promise<PublicationResponse> {
  return get(`/publications/${id}`, publicationResponseSchema);
}

export interface CreatePublicationBody {
  sourceType: PublicationSourceTypeInput;
  sourceId: string;
  format: PublicationFormatInput;
  title: string;
  noteId?: string | null;
  labelIds?: string[];
}

export function createPublication(
  body: CreatePublicationBody,
): Promise<PublicationResponse> {
  return post('/publications', body, publicationResponseSchema);
}

export function editPublication(
  id: string,
  body: Partial<Omit<CreatePublicationBody, 'sourceType' | 'sourceId'>> & {
    stage?: PublicationStageInput;
  },
): Promise<PublicationResponse> {
  return patch(`/publications/${id}`, body, publicationResponseSchema);
}

export function archivePublication(id: string): Promise<PublicationResponse> {
  return post(`/publications/${id}/archive`, {}, publicationResponseSchema);
}

/** Restaura uma publicação arquivada (volta para ACTIVE). */
export function unarchivePublication(id: string): Promise<PublicationResponse> {
  return post(`/publications/${id}/unarchive`, {}, publicationResponseSchema);
}

/** Hard delete — só publicações arquivadas (409 se não estiver arquivada). */
export function deletePublication(id: string): Promise<PublicationResponse> {
  return post(`/publications/${id}/delete`, {}, publicationResponseSchema);
}

// ── AI (modo conectado) ──────────────────────────────────────────────────────

export function runAi(body: AiRunRequest): Promise<AiRunResponse> {
  return post('/ai/run', body, aiRunResponseSchema);
}
