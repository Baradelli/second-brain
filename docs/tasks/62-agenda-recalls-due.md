# Tarefa 62 — Estender `buildTodayAgenda` com `recallsDue`

> Mirror exato da Tarefa 38 (como `goals` entrou): acréscimo retrocompatível à `TodayAgenda`.
> A agenda passa a listar as **revisões devidas hoje** (study items cujo `computeRecallSchedule`
> diz `dueToday`). **Não quebrar o contrato atual.**

## Objetivo

Acrescentar `recallsDue` à `TodayAgenda`, reusando o helper `computeRecallSchedule` (Tarefa 60)
num novo `SelectDueRecalls`, sem duplicar a regra de agendamento.

## `SelectDueRecalls` (`select-due-recalls.ts`) — mirror de `SelectTodaysGoals`

Deps: `StudyItemRepository` + `RecallRepository`. Input `{ userId, reference, timezone }`.
Saída `DueRecallItem[]`:

```ts
interface DueRecallItem {
  studyItemId: string;
  title: string;
  dueToday: boolean; // sempre true na lista retornada (filtramos)
  overdue: boolean;
  nextRecallAt: Date | null;
}
```

Lógica: `studyItems.find({ userId, status: 'ACTIVE' })` → para cada, `recalls.find({ userId,
studyItemId })` → `computeRecallSchedule` → incluir só os `dueToday`. TDD com fakes (cobrir: item
recém-criado não é devido; item com createdAt ≥ 2 dias é devido; consolidado não aparece; atrasado
marca overdue).

## Estender `BuildTodayAgenda`

- Constructor ganha `SelectDueRecalls` (5ª dep). `Promise.all` ganha a chamada.
- `TodayAgenda` ganha `recallsDue: DueRecallItem[]` (campo novo). **`date`/`journal`/
  `capturesToReview`/`goals` inalterados.**
- Teste do UseCase estendido: agenda traz `recallsDue` (com um item devido hoje); campos atuais
  intactos.

## Rota `/agenda`

- Instanciar `PrismaStudyItemRepository` + `PrismaRecallRepository` + `SelectDueRecalls` e passar
  ao `BuildTodayAgenda`.
- `todayAgendaResponseSchema` (inline em `agenda-routes.ts`) ganha
  `recallsDue: z.array(agendaRecallSchema)` com `{ studyItemId, title, dueToday, overdue,
nextRecallAt: string|null }`. Mapear `nextRecallAt` para ISO no handler.
- Teste de rota `/agenda`: response inclui `recallsDue` (array, possivelmente vazio).

## Frontend (contrato)

`packages/mobile/src/lib/api/endpoints.ts` — `todayAgendaSchema` ganha `recallsDue` (a Tarefa 65
consome). Só o schema/tipo aqui; a seção visual é a 65.

## Fora de escopo

- Telas (63–65). Ordenação/priorização por A/B/C (futuro).

## Definição de pronto

- [x] `SelectDueRecalls` + teste (5, fakes).
- [x] `TodayAgenda.recallsDue` (acréscimo); teste do UseCase atualizado, campos atuais intactos.
- [x] Rota `/agenda` com `recallsDue` no schema; wiring dos repos; teste de rota.
- [x] `todayAgendaSchema` do frontend atualizado + endpoints de study-item/recall.
- [x] `unit` (342) + `integration` (151) verdes.
- [x] Marcar BACKLOG + esta definição.
