# Tarefa 46 — Detalhe do dia (backend agregador + página mobile)

> **Bloco D — Calendário com metas reais**, tarefa D3 (fecha o bloco). Ao tocar num dia do
> calendário, abrir o **detalhe daquele dia**: as **metas** daquele dia com **status**
> (feito / pulado / pendente) e as **notas** escritas no dia, com atalho para **abrir** a nota e,
> se for **hoje**, para **Fechar o dia**. Decisão do bloco: **só navegar/visualizar** — o detalhe
> é **read-only** (sem check/skip a partir de dias passados; registrar mora no "Fechar o dia").

## Por que precisa de backend

Não há endpoint que dê, para uma **data arbitrária**, as metas relevantes do dia **com status**.
`buildDayClosing` é só de hoje e só devolve pendentes; `listNotes` filtra por data mas não traz
metas/eventos. Então D3 ganha um **agregador de um dia** (espelha a D1, reusa `SelectTodaysGoals`).

## Estado atual (reaproveitar)

- `SelectTodaysGoals.execute({ userId, reference, timezone })` → metas relevantes de um dia
  (agendadas no weekday + convites de período aberto) com `resolvedToday`, `kind`, `title`, `goalId`.
- `EventRepository.find({ userId, from, to })` (eventos do dia) e `NoteRepository.find({ userId,
status, from, to })` (notas do dia) já existem (fakes idem). `dayRange(ref, tz, 'DAY')` dá a janela.
- `localDayKey` / fuso: `settings...timezone ?? 'America/Sao_Paulo'` (igual D1).
- Frontend: `CalendarPage` (D2) já navega o mês; hoje o toque abre um BottomSheet de resumo
  (será trocado por navegação para esta página). Padrão de página: `ResourceDetailPage`
  (usa `useParams`/`useNavigate`, header com voltar).

## Contrato (`shared/src/calendar.ts`, estender)

```ts
export const calendarDayGoalSchema = z.object({
  goalId: z.string(),
  title: z.string(),
  kind: z.enum(['scheduled', 'invitation']),
  status: z.enum(['done', 'skipped', 'pending']),
});
export const calendarDayNoteSchema = z.object({
  id: z.string(),
  type: noteType, // reusa o enum de note
  title: z.string().optional(),
});
export const calendarDayDetailResponseSchema = z.object({
  date: z.string(), // 'YYYY-MM-DD'
  goals: z.array(calendarDayGoalSchema),
  notes: z.array(calendarDayNoteSchema),
});
export const calendarDayQuerySchema = z.object({
  userId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
```

## UseCase (`backend/src/usecases/build-day-detail.ts`)

```ts
export interface BuildDayDetailInput {
  userId: string;
  date: string; /* 'YYYY-MM-DD' */
}
export interface DayDetailGoal {
  goalId;
  title;
  kind;
  status: 'done' | 'skipped' | 'pending';
}
export interface DayDetailNote {
  id;
  type;
  title?;
}
export interface DayDetail {
  date;
  goals: DayDetailGoal[];
  notes: DayDetailNote[];
}
// deps: GoalRepository, EventRepository, NoteRepository, SettingsReader
```

### Regras (o que os testes provam)

1. **Referência do dia**: monta um instante ao **meio-dia** do dia local (`DateTime.fromFormat(date,
'yyyy-MM-dd',{zone}).set({hour:12})`) para evitar borda de fuso; daí `dayRange(ref, tz, 'DAY')`.
2. **Metas**: vêm de `SelectTodaysGoals` (mesma classificação agendada/convite do app). Ordenadas
   agendadas antes de convites, depois por título (igual `buildDayClosing`).
3. **Status** de cada meta, a partir dos **eventos do dia** (uma busca, agrupada por `goalId`):
   tem `done` → `'done'`; senão tem `skip` → `'skipped'`; senão `'pending'`.
4. **Notas**: `notes.find({ userId, status:'ACTIVE', from, to })` (todas as notas com `date` no dia),
   mapeadas para `{ id, type, title }`, ordenadas por `createdAt` desc.
5. **Isolamento por usuário** e **fuso** (data inválida → o regex da rota barra antes; o usecase
   confia na `date` já validada).

## Rota (`backend/src/routes/calendar-routes.ts`, +endpoint)

`GET /calendar/day` — querystring `calendarDayQuerySchema`; response `200:
calendarDayDetailResponseSchema`. Handler: `buildDayDetail.execute({ userId, date })`.

## Frontend

- **API**: `getDayDetail(date): Promise<CalendarDayDetailResponse>` → `GET /calendar/day`.
- **`DayDetailPage`** (`pages/DayDetailPage.tsx`, rota `/calendar/:date`):
  - Header: data por extenso (locale do i18n) + voltar (`navigate(-1)` ou `/calendar`).
  - **Seção Metas**: cada meta com **badge de status** (Feito/Pulado/Pendente) + título. Vazio →
    EmptyState. (Read-only — sem botões de check/skip.)
  - **Seção Notas**: cada nota com tipo + título; toque → `/editor/:id`. Vazio → EmptyState.
  - Se a data for **hoje** e houver meta **pendente**, CTA **"Fechar o dia"** → `/day-closing`.
  - loading/error padrão.
- **`CalendarPage`**: trocar o toque do dia (hoje abre BottomSheet) por
  `navigate('/calendar/' + day.date)`; **remover** o BottomSheet de resumo e os helpers
  `DaySummary`/`Seal` (a visão rica agora é a página).
- **Router**: `{ path: 'calendar/:date', element: <DayDetailPage /> }`.
- **i18n** pt/en: `calendar.day.goalsSection`, `calendar.day.notesSection`,
  `calendar.day.status.done|skipped|pending`, `calendar.day.noGoals`, `calendar.day.noNotes`,
  `calendar.day.closeDay`, `calendar.day.back`. (Remover as chaves do resumo que sobrarem sem uso:
  `goalsSummary`/`goalsDoneOnly`/`journal`/`devotional`/`reflection` podem ficar — são inofensivas —
  ou limpar; manter `noGoals`.)

## Testes

- **Unit** `build-day-detail.test.ts` (fakes; fuso SP): meta agendada sem evento → `pending`;
  com `done` → `done`; com `skip` → `skipped`; ordem agendada→convite/título; notas do dia
  mapeadas e ordenadas; nota de outro dia/arquivada/outro user não aparece; isolamento por usuário.
- **Rota** (integração, 1–2): `GET /calendar/day?userId&date=` → 200 com `{date, goals, notes}`;
  `date` mal formada → 400 (Zod).
- **UI** `daydetail.test.tsx`: renderiza metas com status e notas; toque numa nota navega para
  `/editor/:id`; erro quando o fetch falha. Atualizar `calendar.test.tsx`: o toque no dia agora
  **navega** para `/calendar/:date` (não abre sheet).

## Arquivos a tocar

- `packages/shared/src/calendar.ts` (+schemas do detalhe).
- `packages/backend/src/usecases/build-day-detail.ts` (novo) + teste.
- `packages/backend/src/routes/calendar-routes.ts` (+endpoint) + teste de rota.
- `packages/mobile/src/lib/api/endpoints.ts` (+`getDayDetail`).
- `packages/mobile/src/pages/DayDetailPage.tsx` (novo); `CalendarPage.tsx` (navega, tira sheet).
- `packages/mobile/src/router.tsx` (+rota); `locales/{pt,en}.json` (+chaves).
- `packages/mobile/src/__tests__/daydetail.test.tsx` (novo) + ajustar `calendar.test.tsx`.

## Definição de pronto

- [x] `buildDayDetail` (status feito/pulado/pendente + notas do dia) com TDD (8); isolamento e fuso.
- [x] `calendarDayDetail*` em `shared/`; rota `GET /calendar/day` (200 + 400).
- [x] `getDayDetail` no client; `DayDetailPage` (metas com status + notas + CTA fechar o dia hoje).
- [x] `CalendarPage` navega para o detalhe (sheet removido); rota `/calendar/:date`.
- [x] i18n pt/en; back unit **274** + integração calendar **4**; mobile **103**; typechecks limpos; lint ok.
- [x] Marcar D3 + **fechar o Bloco D** em `MELHORIAS.md` e reportar.
