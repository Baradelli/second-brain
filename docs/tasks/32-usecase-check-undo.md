# Tarefa 32 — Domínio `Event` + UseCases `checkGoal` / `undoCheck`

> Abre o **Bloco K — Event + progresso**. TDD estrito (fake repos). Cria o domínio `Event` e
> os dois UseCases que registram/desfazem um check. **`undoCheck` é a única exceção
> documentada ao "Event é log imutável": hard delete.** Ver `CLAUDE.md` e as decisões fechadas
> do MVP 2 em `docs/BACKLOG.md`.
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.** Em conflito com esta spec, vale aquele
> arquivo.

## Objetivo

Registrar que um objetivo foi cumprido (cria um `Event` `done`) e desfazer esse registro
(hard delete do `Event`). Regra na camada de aplicação, sobre `GoalRepository` (já pronto) e
um novo `EventRepository` (mínimo aqui; Prisma + contrato na Tarefa 35).

## Decisões já tomadas (do BACKLOG — não reabrir)

- **Check de objetivo = criar um `Event` `done`.** Progresso é **calculado** (Tarefa 34).
- **UMBRELLA não recebe check direto** (fecha na mão — Tarefa 31). `checkGoal` rejeita UMBRELLA.
- **Desfazer check = hard delete do `Event`** — única exceção ao log imutável. `Event` não tem
  `status`/`archivedAt`.
- **`occurredAt` ≠ `createdAt`**: dá pra registrar à noite algo feito de manhã. "Que dia foi" é
  calculado depois (Tarefa 34) no timezone do Settings.

## Mini-domínio

`src/domain/event.ts`:

```ts
export type EventType = 'done' | 'skip';

export interface Event {
  id: string;
  userId: string;
  goalId: string;
  type: EventType;
  value: number | null;  // TARGET/PROJECT: quanto somou neste check (done). skip: null
  reason: string | null; // obrigatório quando type='skip' (Tarefa 33). done: null
  occurredAt: Date;      // instante UTC
  createdAt: Date;
}
```

Erros novos em `src/domain/errors.ts`: `EventNotFoundError(id)` e `InvalidCheckError(message)`.
(UMBRELLA-não-checa pode ser `InvalidCheckError('UMBRELLA cannot be checked directly')` — ou
reusar `InvalidGoalError`; preferir `InvalidCheckError` para deixar claro que é erro do check.)

## Repository (mínimo desta fatia)

`src/usecases/ports/event-repository.ts` — declarar a interface; implementar agora só o
necessário (a Tarefa 34 acrescenta `find`; a 35 faz o Prisma + contrato):

```ts
export interface EventFilter {
  userId: string;
  goalId?: string;
  goalIds?: string[];          // agregação de UMBRELLA (Tarefa 34)
  type?: EventType;
  from?: Date;                 // occurredAt >= from
  to?: Date;                   // occurredAt <= to
}

export interface EventRepository {
  save(event: Event): Promise<Event>;
  byId(id: string): Promise<Event | null>;
  delete(id: string): Promise<void>; // hard delete (exceção do undo)
  // find(filter: EventFilter): Promise<Event[]>; // chega na Tarefa 34
}
```

`src/usecases/_fakes/event-repository-fake.ts` — implementa `save`/`byId`/`delete` agora.

## Contrato dos UseCases

`src/usecases/check-goal.ts`:

```ts
export interface CheckGoalInput {
  goalId: string;
  userId: string;       // dono; senão GoalNotFoundError (não vaza)
  value?: number | null; // TARGET/PROJECT: quanto somou neste check
  occurredAt?: Date;    // default: now
}
type CheckGoalOutput = Event; // type='done'

// depende de GoalRepository (byId) + EventRepository (save)
```

`src/usecases/undo-check.ts`:

```ts
export interface UndoCheckInput {
  eventId: string;
  userId: string; // dono; senão EventNotFoundError
}
type UndoCheckOutput = void;

// depende de EventRepository (byId + delete)
```

## Regras de negócio (o que os testes provam)

`checkGoal`:

1. Goal inexistente ou de outro user → `GoalNotFoundError` (não vaza).
2. Goal arquivado → `InvalidCheckError` ('cannot check an archived goal'). (Decisão.)
3. **UMBRELLA → `InvalidCheckError`** (não recebe check direto).
4. **HABIT**: `value` deve ser ausente/null (um hábito é "fiz/não fiz", sem quantidade) →
   senão `InvalidCheckError`. Persiste `value=null`.
5. **TARGET/PROJECT**: `value` **obrigatório** e > 0 → senão `InvalidCheckError`. (Decisão.)
6. Cria `Event` `done` com `reason=null`, `occurredAt = input.occurredAt ?? now`, `createdAt=now`.

`undoCheck`:

7. Event inexistente ou de outro user → `EventNotFoundError`.
8. Só desfaz check: se o event for `type='skip'` → `InvalidCheckError` ('use a different flow
   to undo a skip'). (Decisão — desfazer skip fica fora desta fatia.)
9. `type='done'` → `repo.delete(eventId)` (hard delete). Idempotência não se aplica (sumiu).

## Decisões que assumi (revisar antes de executar)

- **`value` obrigatório > 0 em TARGET/PROJECT**; ausente/null em HABIT. Se quiser permitir check
  de TARGET sem `value` (ex.: marcar "fiz" sem quantificar), relaxo a regra 5.
- **Não dá pra checar goal arquivado** (regra 2). Se preferir permitir, removo.
- **`undoCheck` só apaga `done`** (regra 8); desfazer um `skip` seria outro fluxo. Se quiser um
  `undoEvent` genérico que apaga qualquer um, eu generalizo.
- **Sem deduplicação por dia**: dá pra ter 2 checks `done` no mesmo dia (faz sentido para
  TARGET/PROJECT — somam `value`; para HABIT a Tarefa 34 conta dias distintos, então duplicar
  não infla o progresso). Não bloqueio duplicata aqui.

## Testes a escrever PRIMEIRO (Vitest, fakes)

`src/usecases/__tests__/check-goal.test.ts`:

- HABIT → cria `done` com `value=null`, `occurredAt` default/explicit;
- TARGET com `value>0` → ok; TARGET sem `value` ou `value<=0` → erro; HABIT com `value` → erro;
- UMBRELLA → erro; goal arquivado → erro; goal de outro user/inexistente → `GoalNotFoundError`.

`src/usecases/__tests__/undo-check.test.ts`:

- apaga um `done` (some do fake); event inexistente/de outro user → `EventNotFoundError`;
- tentar desfazer um `skip` → `InvalidCheckError`.

## Arquivos a tocar

- `src/domain/event.ts` (novo) · `src/domain/errors.ts` (2 erros novos).
- `src/usecases/ports/event-repository.ts` (novo) · `_fakes/event-repository-fake.ts` (novo).
- `src/usecases/check-goal.ts` · `src/usecases/undo-check.ts` + testes.
- **Não** tocar: `shared/`, Prisma, rotas, telas, `find` do EventRepository (Tarefa 34).

## Fora de escopo

- `skipGoal` (Tarefa 33). `computeGoalProgress` + `find` (Tarefa 34).
- Impl Prisma do EventRepository, contrato, rotas check/skip/undo (Tarefa 35).
- Zod em `shared/`, telas.

## Definição de pronto

- [ ] Domínio `Event` + erros criados.
- [ ] `EventRepository` (save/byId/delete) + fake.
- [ ] `checkGoal` (rejeita UMBRELLA; regra de `value` por tipo; goal arquivado/owner) e
      `undoCheck` (hard delete de `done`) implementados, dependendo só das interfaces.
- [ ] Testes de UseCase escritos **antes**, todos verdes, cobrindo as 9 regras.
- [ ] Sem Prisma/Fastify/Zod/tela tocados.
- [ ] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar feito vs definição e **parar**.
