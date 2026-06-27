# Tarefa 60 — Domínio `recall-schedule` (escada) + UseCases `logRecall` / `undoRecall`

> Fecha a fundação do **Bloco N**. TDD estrito (fake repos). Cria o domínio `Recall`, o **helper
> puro de agendamento** (a escada fixa — **TDD pesado aqui**, é o cérebro do motor) e os dois
> UseCases que registram/desfazem uma revisão. **`undoRecall` é a exceção documentada ao "log
> imutável": hard delete** (espelha `undoCheck` do `Event`). Ver `CLAUDE.md`, `docs/BACKLOG.md`
> (decisões fechadas) e `docs/LEITURA-RETENTIVA.md` (§4).
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.** Em conflito com esta spec, vale aquele arquivo.

## Objetivo

1. **Calcular** quando um `StudyItem` deve ser revisado (escada fixa 2d → 1sem → 1mês) e se já
   **consolidou** — função **pura**, só leitura, no `domain/`, com Luxon e no timezone do Settings.
2. Registrar uma revisão (cria um `Recall` com `confidence` A/B/C) e desfazê-la (hard delete).

Regra na camada de aplicação, sobre `StudyItemRepository` (Tarefa 59) e um novo `RecallRepository`
(mínimo aqui; Prisma + contrato na Tarefa 61).

## Decisões já tomadas (do BACKLOG — não reabrir)

- **Escada fixa, igual para todos:** `LADDER_DAYS = [2, 7, 30]`. A base do 1º intervalo é
  `StudyItem.createdAt` (o fichamento = "mesmo dia"); depois é a `occurredAt` da última `Recall`.
- **A/B/C NÃO muda o intervalo.** É registro metacognitivo (Prática 7) para priorizar/destacar;
  o agendamento segue a escada. _(Revisável no futuro: um "C" repetir o passo.)_
- **`nextRecallAt`/consolidado são calculados, nunca guardados** (princípio do projeto).
- **Desfazer revisão = hard delete do `Recall`** — única exceção ao log imutável. `Recall` não tem
  `status`/`archivedAt`.
- **`occurredAt` ≠ `createdAt`**: dá para registrar à noite uma revisão feita de manhã. "Que dia foi"
  é calculado no timezone do Settings (reusar `dayRange`/helpers de data do `domain/`).

## Mini-domínio

`src/domain/recall.ts`:

```ts
export type RecallConfidence = 'A' | 'B' | 'C'; // A=sei explicar, B=reconheço, C=não sei

export interface Recall {
  id: string;
  userId: string;
  studyItemId: string;
  confidence: RecallConfidence;
  note: string | null;
  occurredAt: Date; // instante UTC
  createdAt: Date;
}
```

### Helper puro de agendamento — `src/domain/recall-schedule.ts` (o coração; TDD pesado)

Recebe os dados **já lidos** (não acessa repo) e devolve o estado de agendamento:

```ts
export const LADDER_DAYS = [2, 7, 30] as const; // 2 dias → 1 semana → 1 mês

export interface RecallScheduleInput {
  createdAt: Date; // do StudyItem (= dia do fichamento)
  recalls: { occurredAt: Date }[]; // todas as recalls do item (qualquer ordem)
  timezone: string; // do Settings
  reference: Date; // "agora" / o instante de referência (ex.: hoje)
}

export interface RecallSchedule {
  index: number; // nº de recalls já feitas (0,1,2,...)
  consolidated: boolean; // index >= LADDER_DAYS.length
  nextRecallAt: Date | null; // null se consolidado
  dueToday: boolean; // !consolidated && localDay(nextRecallAt) <= localDay(reference)
  overdue: boolean; // dueToday por estar atrasada (localDay(nextRecallAt) < localDay(reference))
}

export function computeRecallSchedule(
  input: RecallScheduleInput,
): RecallSchedule;
```

Regras do cálculo:

- `index = recalls.length`.
- `consolidated = index >= LADDER_DAYS.length` (após 3 recalls). Então `nextRecallAt = null`,
  `dueToday = false`.
- senão `base = index === 0 ? createdAt : max(recalls.occurredAt)`; `nextRecallAt =
base + LADDER_DAYS[index] dias` (Luxon `.plus({ days })`).
- comparação de "dia" via timezone: usar o helper de data existente (`dayRange`/`day-range.ts`) —
  **não** comparar instantes crus. `dueToday` inclui atrasadas (`<=`).

> Espelha o espírito de `compute-goal-progress` (puro, só leitura) e usa os helpers de `day-range`.

Erros novos em `src/domain/errors.ts`: `RecallNotFoundError(id)` e `InvalidRecallError(message)`.

## Repository (mínimo desta fatia)

`src/usecases/ports/recall-repository.ts`:

```ts
export interface RecallFilter {
  userId: string;
  studyItemId?: string;
  studyItemIds?: string[]; // p/ agenda em lote (Tarefa 62)
}

export interface RecallRepository {
  save(recall: Recall): Promise<Recall>;
  byId(id: string): Promise<Recall | null>;
  delete(id: string): Promise<void>; // hard delete (exceção do undo)
  find(filter: RecallFilter): Promise<Recall[]>; // usado para calcular a escada
}
```

`src/usecases/_fakes/recall-repository-fake.ts` — implementa os quatro métodos.

## Contrato dos UseCases

`src/usecases/log-recall.ts`:

```ts
export interface LogRecallInput {
  studyItemId: string;
  userId: string; // dono; senão StudyItemNotFoundError (não vaza)
  confidence: RecallConfidence; // 'A' | 'B' | 'C'
  note?: string | null;
  occurredAt?: Date; // default: now
}
type LogRecallOutput = Recall;

// depende de StudyItemRepository (byId) + RecallRepository (save)
```

`src/usecases/undo-recall.ts`:

```ts
export interface UndoRecallInput {
  recallId: string;
  userId: string; // dono; senão RecallNotFoundError
}
type UndoRecallOutput = void;

// depende de RecallRepository (byId + delete)
```

## Regras de negócio (o que os testes provam)

`logRecall`:

1. `StudyItem` inexistente ou de outro user → `StudyItemNotFoundError` (não vaza).
2. `StudyItem` arquivado → `InvalidRecallError` ('cannot recall an archived item'). (Decisão.)
3. `confidence` fora de A/B/C → `InvalidRecallError`. (Borda Zod reforça na 61.)
4. Cria `Recall` com `occurredAt = input.occurredAt ?? now`, `createdAt=now`, `note ?? null`.
5. **Não** muda o `StudyItem` (status/consolidação são calculados; não materializa aqui).

`undoRecall`:

6. `Recall` inexistente ou de outro user → `RecallNotFoundError`.
7. `repo.delete(recallId)` (hard delete). Idempotência não se aplica (sumiu).

`computeRecallSchedule` (o grosso do TDD — função pura):

8. 0 recalls → `index=0`, `nextRecallAt = createdAt + 2 dias`, não consolidado.
9. 1 recall → `nextRecallAt = lastOccurredAt + 7 dias`; 2 recalls → `+ 30 dias`.
10. 3 recalls → `consolidated=true`, `nextRecallAt=null`, `dueToday=false`.
11. `dueToday=true` quando `localDay(nextRecallAt) <= localDay(reference)` (inclui **atrasada**);
    `overdue=true` só quando estritamente `<`.
12. Timezone respeitado: um `nextRecallAt` que cai "ontem 23h UTC" mas "hoje" no fuso de São Paulo
    é tratado pelo **dia local**, não pelo instante. (Caso de borda de fuso, igual aos testes de
    `day-range`/`compute-goal-progress`.)
13. `recalls` fora de ordem → usa o **máximo** `occurredAt` como base.

## Decisões que assumi (revisar antes de executar)

- **Não dá para revisar item arquivado** (regra 2). Se preferir permitir, removo.
- **`logRecall` não materializa CONSOLIDATED no `StudyItem`** (regra 5): o estado é calculado pela
  escada. Se quisermos materializar (para query/índice), isso entra na 61 como efeito do repo, não
  aqui. Decisão: manter o domínio puro/calculado por ora.
- **Sem deduplicação por dia**: dá para ter 2 recalls no mesmo dia (não quebra a escada — o índice
  conta recalls; _se_ quisermos contar "dias distintos" em vez de "recalls", reabrir). Não bloqueio.
- **`undoRecall` apaga qualquer `Recall` do dono** (não só o último). Se quiser permitir desfazer só
  o mais recente, restrinjo.

## Testes a escrever PRIMEIRO (Vitest, fakes)

`src/domain/__tests__/recall-schedule.test.ts` (**o mais denso** — função pura):

- 0/1/2/3 recalls → index/nextRecallAt/consolidated corretos (regras 8–10);
- atrasada vs no dia vs futura → dueToday/overdue (regra 11);
- borda de fuso (regra 12); recalls fora de ordem (regra 13).

`src/usecases/__tests__/log-recall.test.ts`:

- cria `Recall` com `occurredAt` default/explícito e `note`; A/B/C válidos;
- item arquivado → erro; confidence inválida → erro; item inexistente/de outro user → not found.

`src/usecases/__tests__/undo-recall.test.ts`:

- apaga um `Recall` (some do fake); inexistente/de outro user → `RecallNotFoundError`.

Ciclo: red → green → refactor.

## Arquivos a tocar

- `src/domain/recall.ts` (novo) · `src/domain/recall-schedule.ts` (novo) · `src/domain/errors.ts`
  (2 erros novos).
- `src/usecases/ports/recall-repository.ts` (novo) · `_fakes/recall-repository-fake.ts` (novo).
- `src/usecases/log-recall.ts` · `src/usecases/undo-recall.ts` + testes acima.
- **Reusar** os helpers de data existentes (`src/domain/day-range.ts` etc.) — não criar lógica de
  fuso nova.
- **Não** tocar: `shared/`, Prisma, rotas, telas, agenda (Tarefa 62).

## Fora de escopo

- Impl Prisma de `StudyItemRepository`/`RecallRepository`, contrato, `find`/filtros avançados, Zod
  em `shared/`, rotas (Tarefa 61).
- Estender a agenda com `recallsDue` (Tarefa 62) — **mas** o helper `computeRecallSchedule` desta
  tarefa é o que a 62 vai reusar.
- Telas, publicação, IA.

## Definição de pronto

- [x] Domínio `Recall` + helper puro `computeRecallSchedule` (escada `[2,7,30]`, consolidação,
      dueToday/overdue no timezone) + 2 erros novos (`RecallNotFoundError`/`InvalidRecallError`).
- [x] `RecallRepository` (save/byId/delete/find) + fake.
- [x] `logRecall` (valida confidence A/B/C, dono, item não-arquivado; `occurredAt` default) e
      `undoRecall` (hard delete) implementados, dependendo só das interfaces.
- [x] Testes escritos **antes**, todos verdes, cobrindo as regras 1–13 (com peso no
      `recall-schedule`: escada, fuso local, atrasadas, fora de ordem, consolidação).
      (recall-schedule: 10 · log-recall: 7 · undo-recall: 3 = 20)
- [x] Agendamento **calculado** (nenhuma coluna nova); `Recall` sem `status`/`archivedAt`.
- [x] Sem Prisma/Fastify/Zod/tela tocados.
- [x] Reportar feito vs definição e **parar** (não emendar a Tarefa 61).
