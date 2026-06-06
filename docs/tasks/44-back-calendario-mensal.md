# Tarefa 44 — Backend agregador de calendário mensal (`buildMonthCalendar`)

> **Bloco D — Calendário com metas reais**, tarefa D1. A fundação: um agregador que devolve,
> por dia do mês, **metas previstas × cumpridas** (metas reais, dos `Event`) e o **selo de
> diário** (devocional/reflexão). Só leitura, **TDD pesado** (como o `computeGoalProgress`).
> Frontend (calendário mensal + detalhe do dia) vem nas D2/D3, depois desta. Decisões do bloco
> em `docs/MELHORIAS.md`.

## Decisões do bloco (já fechadas com o dono)

- **O que cada dia marca:** objetivos **previstos × cumpridos** + **selo de diário**
  (devocional/reflexão). Notas/capturas **fora** deste agregador (decisão explícita).
- **Backend agregador** `GET /calendar` (uma chamada por mês), reaproveitando os helpers de
  data e a lógica de evento/objetivo — não espalhar cálculo de calendário no cliente.
- **Escopo: só navegar/visualizar.** Sem streaks/aderência/percentuais — isso é MVP 3.
- Navegação (substituir aba "Assistente") e telas são **D2/D3** (frontend), fora desta tarefa.

## Estado atual (já pronto, reutilizar)

- `dayRange(reference, tz, 'MONTH')` → janela UTC `[from, to]` do mês no fuso (Luxon).
- `localWeekday(date, tz)` → 0=domingo..6=sábado (mesma convenção de `Goal.weekdays`).
- `SelectTodaysGoals` / `computeGoalProgress` mostram como classificar HABIT por `weekdays`
  e por período, e como contar `done` numa janela.
- `EventRepository.find({ userId, type, from, to })` e `NoteRepository.find({ userId, type,
  scope, from, to, status })` já existem (fakes idem). `Note.date` é a data lógica do dia.
- Diário = existência de uma `Note` `DEVOTIONAL` / `REFLECTION` no dia (ver `buildTodayAgenda`).
- Fuso: `settings.getByUserId(userId)?.timezone ?? 'America/Sao_Paulo'` (igual a
  `buildDayClosing`/`computeGoalProgress`).

## Helper de data (domínio)

`backend/src/domain/calendar-month.ts` (novo) — mantém o cálculo instante↔dia num lugar só:

```ts
import { DateTime } from 'luxon';

/** Dia local ('YYYY-MM-DD') de um instante UTC, no fuso do usuário. */
export function localDayKey(instant: Date, timezone: string): string { … }

/** Lista 'YYYY-MM-DD' de todos os dias do mês ('YYYY-MM') no fuso. Lança se mês inválido. */
export function monthDayKeys(month: string, timezone: string): string[] { … }
```

## Contrato

`shared/src/calendar.ts` (novo, exportar no `index.ts`):

```ts
export const calendarDaySchema = z.object({
  date: z.string(),                          // 'YYYY-MM-DD' (dia local)
  goalsPlanned: z.number().int().nonnegative(),
  goalsDone: z.number().int().nonnegative(),
  journal: z.object({ devotional: z.boolean(), reflection: z.boolean() }),
});
export const calendarMonthResponseSchema = z.object({
  month: z.string(),                         // 'YYYY-MM'
  days: z.array(calendarDaySchema),
});
export const calendarQuerySchema = z.object({
  userId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(), // ausente → mês corrente
});
```

`backend/src/usecases/build-month-calendar.ts`:

```ts
export interface BuildMonthCalendarInput {
  userId: string;
  month?: string;    // 'YYYY-MM'; ausente → mês de `reference`
  reference?: Date;  // default new Date() (resolve o mês corrente)
}
export interface CalendarDay {
  date: string;
  goalsPlanned: number;
  goalsDone: number;
  journal: { devotional: boolean; reflection: boolean };
}
export interface MonthCalendar { month: string; days: CalendarDay[] }
// deps: GoalRepository, EventRepository, NoteRepository, SettingsReader
```

## Regras (o que os testes provam)

Para cada dia local `D` do mês pedido:

1. **`goalsPlanned`** = nº de objetivos HABIT **ACTIVE** "agendados" em `D`, ou seja:
   - `D`'s weekday ∈ `goal.weekdays` (só hábitos de **dias fixos** contam como _previstos_;
     hábitos por **período** — `weekdays` vazio — **não** entram em previstos), **e**
   - `D >= localDayKey(goal.startAt ?? goal.createdAt)` (não conta antes do objetivo existir), **e**
   - `goal.completedAt == null` **ou** `D <= localDayKey(goal.completedAt)` (não conta depois de concluído).
2. **`goalsDone`** = nº de **objetivos distintos** (dentre os HABIT ACTIVE carregados) com **pelo
   menos um** `Event` `type='done'` cujo `localDayKey(occurredAt) === D`. (Um objetivo com 2 dones
   no mesmo dia conta 1. Eventos de objetivos arquivados/não-hábito não contam.)
3. **`journal.devotional`** = existe `Note` `DEVOTIONAL` `status='ACTIVE'` com `localDayKey(date) === D`.
   **`journal.reflection`** = idem para `REFLECTION`. (Múltiplas no dia → continua `true`.)
4. **Mês**: `month` ausente → usa o mês de `reference` (default `new Date()`) no fuso do usuário.
   `days` cobre **todos** os dias do mês (1..28/29/30/31), em ordem, mesmo os vazios
   (`0`/`0`/`false`/`false`).
5. **Isolamento por usuário**: objetivos/eventos/notas de outro `userId` nunca entram.
6. Eficiência: **uma** busca de objetivos, **uma** de eventos (`done`, janela do mês) e **duas**
   de notas (DEVOTIONAL/REFLECTION, janela do mês) — agrupa em memória por `localDayKey`. Sem
   query por dia.

## Rota

`backend/src/routes/calendar-routes.ts` (novo) + registrar em `http/server.ts`:

- `GET /calendar` — querystring `calendarQuerySchema`; response `200: calendarMonthResponseSchema`.
- Handler: `buildMonthCalendar.execute({ userId: req.query.userId, month: req.query.month })`.
- Injeta `PrismaGoalRepository`, `PrismaEventRepository`, `PrismaNoteRepository`,
  `PrismaSettingsReader`.

## Testes

- **Unit** `build-month-calendar.test.ts` (fakes; TDD pesado, fuso `America/Sao_Paulo`):
  - hábito de dias fixos previsto em alguns weekdays do mês → `goalsPlanned` certo só nesses dias.
  - hábito por **período** (weekdays vazio) **não** entra em previstos, mas seu `done` **conta** em `goalsDone`.
  - `done` no dia → `goalsDone` conta 1; 2 dones no mesmo dia → ainda 1; dones em dias diferentes contam em cada dia.
  - gating: dias **antes** de `startAt ?? createdAt` não contam previstos; dias **depois** de `completedAt` idem.
  - diário: nota DEVOTIONAL/REFLECTION no dia → selo `true`; sem nota → `false`; nota ARCHIVED não conta.
  - mês ausente → usa mês de `reference`; `days` tem o nº certo de dias (testar fev/30/31).
  - fuso: evento perto da meia-noite cai no **dia local** certo (ex.: `02:00Z` em SP é dia anterior).
  - isolamento: dados de outro user não aparecem.
- **Unit** `calendar-month.test.ts` (helpers): `localDayKey` (fuso) e `monthDayKeys` (nº de dias, ordem, mês inválido lança).
- **Rota** (integração, 1–2 caminhos): `GET /calendar?userId=…&month=…` → 200 com `days` do mês;
  query sem `userId` → 400 (Zod).

## Arquivos a tocar

- `packages/shared/src/calendar.ts` (novo) + `index.ts` (export).
- `packages/backend/src/domain/calendar-month.ts` (novo) + teste.
- `packages/backend/src/usecases/build-month-calendar.ts` (novo) + teste.
- `packages/backend/src/routes/calendar-routes.ts` (novo) + teste de rota.
- `packages/backend/src/http/server.ts` (registrar a rota).
- **Não** tocar: telas, outros usecases.

## Definição de pronto

- [x] Helpers `localDayKey` / `monthDayKeys` com teste (8 testes).
- [x] `buildMonthCalendar` provando as regras 1–6 (TDD), com fakes; isolamento por usuário e fuso (14 testes).
- [x] `calendar*Schema` em `shared/`; rota `GET /calendar` (200 + 400 do Zod), registrada no server.
- [x] `unit` (266) e `integration` (116) verdes — sem regressões.
- [x] Marcar D1 em `MELHORIAS.md` e reportar (parar antes de D2/D3 para revisão).
