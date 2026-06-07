# Tarefa 47 — Backend: excluir / desarquivar / listar arquivados (objetivos)

> **Bloco F — Gerência de objetivos**, parte backend. Completa o ciclo de gerência: além de
> editar/arquivar (já existem), poder **listar arquivados**, **restaurar** (desarquivar) e
> **excluir de vez** os objetivos que **nunca foram feitos**. TDD no domínio. Frontend é a 48.

## Decisões (fechadas)

- **Excluir** só quando o objetivo **não tem nenhum evento `done`**. Se tiver só `skip`, esses
  eventos são **apagados junto** (o objetivo nunca aconteceu). Com `done` → **não exclui**
  (respeita "Event = log imutável"). Também **não exclui** se tiver **filhos** (qualquer status).
- Exclusão só a partir de **arquivado** (a área de arquivados é o ponto de saída).
- **Restaurar** = volta a `ACTIVE`, `archivedAt = null`.
- Listagem de arquivados traz `deletable` (= não tem `done`) para a UI decidir o que mostrar.

## Estado atual (reaproveitar)

- `GoalRepository`: `byId` / `find` / `update`. **Falta `delete`** (port + fake + Prisma).
- `EventRepository`: `find({ userId, goalId, type })` e `delete(id)` (hard delete já existe — é a
  exceção do undo-check). Reusar para checar `done` e apagar `skip`s.
- Erros em `domain/errors.ts`: `GoalNotFoundError` existe. **Adicionar**: `GoalNotArchivedError`,
  `GoalHasDoneHistoryError`, `GoalHasChildrenError`.
- Rotas de goal já mapeiam `GoalNotFoundError`→404; seguir o padrão.

## Repositório

`GoalRepository.delete(id: string): Promise<void>` — port + fake (remove do Map) + Prisma
(`prisma.goal.delete({ where: { id } })`).

## UseCases (TDD com fakes)

### `DeleteGoal` (deps: GoalRepository, EventRepository)

`execute({ id, userId }): Promise<Goal>` (devolve o snapshot do que foi excluído)

1. `byId`; inexistente ou de outro user → `GoalNotFoundError`.
2. `status !== 'ARCHIVED'` → `GoalNotArchivedError`.
3. filhos (`find({ userId, parentId: id })`, qualquer status) > 0 → `GoalHasChildrenError`.
4. eventos `done` (`find({ userId, goalId: id, type: 'done' })`) > 0 → `GoalHasDoneHistoryError`.
5. apaga os eventos restantes do goal (`find({ userId, goalId: id })` → `events.delete(e.id)`).
6. `goals.delete(id)`; retorna o snapshot.

### `UnarchiveGoal` (deps: GoalRepository)

`execute({ id, userId }): Promise<Goal>` — `byId`/owner senão `GoalNotFoundError`;
`update(id, { status: 'ACTIVE', archivedAt: null })`. Idempotente se já ativo.

### `ListArchivedGoals` (deps: GoalRepository, EventRepository)

`execute({ userId }): Promise<{ goal: Goal; deletable: boolean }[]>`

- `find({ userId, status: 'ARCHIVED' })`; `deletable = ` sem evento `done`. Para eficiência,
  buscar os `done` do user uma vez (`find({ userId, type: 'done' })`) e montar um Set de goalIds.
- Ordena por `archivedAt` desc.

## Contrato (`shared/src/goal.ts`)

```ts
export const archivedGoalSchema = goalResponseSchema.extend({
  deletable: z.boolean(),
});
export type ArchivedGoalResponse = z.infer<typeof archivedGoalSchema>;
// delete/unarchive: body só com userId (inline na rota: z.object({ userId: z.string().min(1) }))
```

## Rotas (`goal-routes.ts`)

- `GET /goals/archived` — querystring `{ userId }`; `200: z.array(archivedGoalSchema)`.
- `POST /goals/:id/unarchive` — body `{ userId }`; `200: goalResponseSchema`, `404`.
- `POST /goals/:id/delete` — body `{ userId }`; `200: goalResponseSchema`, `404`, `409`
  (`GoalNotArchivedError` / `GoalHasChildrenError` / `GoalHasDoneHistoryError` → 409 com `{error}`).
- Atenção à ordem: `GET /goals/archived` não conflita (não há `GET /goals/:id`).

## Testes

- **Unit**:
  - `delete-goal.test.ts`: arquivado + sem `done` (com `skip`) → exclui e apaga os skips; com
    `done` → `GoalHasDoneHistoryError` (não exclui, eventos intactos); não arquivado →
    `GoalNotArchivedError`; com filho → `GoalHasChildrenError`; outro user → `GoalNotFoundError`.
  - `unarchive-goal.test.ts`: arquivado → ACTIVE + `archivedAt=null`; outro user → not found.
  - `list-archived-goals.test.ts`: só arquivados, ordenados por `archivedAt` desc; `deletable`
    true sem `done` / false com `done`; isola por usuário.
- **Repo (contrato, integração)**: `delete` remove o goal (em `prisma-goal-repository.integration`).
- **Rotas (integração)**: `GET /goals/archived` → 200 lista; `POST /goals/:id/unarchive` → 200;
  `POST /goals/:id/delete` de objetivo com `done` → 409.

## Arquivos a tocar

- `packages/shared/src/goal.ts` (+`archivedGoalSchema`).
- `packages/backend/src/domain/errors.ts` (+3 erros).
- `packages/backend/src/usecases/ports/goal-repository.ts` (+`delete`).
- `packages/backend/src/usecases/_fakes/goal-repository-fake.ts` (+`delete`).
- `packages/backend/src/repositories/prisma-goal-repository.ts` (+`delete`).
- `packages/backend/src/usecases/{delete-goal,unarchive-goal,list-archived-goals}.ts` (novos) + testes.
- `packages/backend/src/routes/goal-routes.ts` (+3 rotas) + testes de rota.
- **Não** tocar: front (tarefa 48), schema do Event, migrações.

## Definição de pronto

- [x] `GoalRepository.delete` (port + fake + Prisma + contrato de integração).
- [x] `deleteGoal` (gates arquivado/sem-done/sem-filhos; apaga skips), `unarchiveGoal`,
      `listArchivedGoals` (com `deletable`) — TDD verde (5+2+2).
- [x] `archivedGoalSchema` em `shared/`; rotas `GET /goals/archived`, `POST /goals/:id/unarchive`,
      `POST /goals/:id/delete` (404/409 mapeados).
- [x] `unit` (283) e `integration` (goals 12 + repo) verdes; typechecks limpos; lint ok.
- [x] Reportar e parar antes da 48 (frontend).
