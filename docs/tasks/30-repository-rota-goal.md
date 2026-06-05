# Tarefa 30 — Repository de `Goal` (Prisma + contrato) + `editGoal`/`listActiveGoals` + Zod + rotas `/goals`

> Fecha a persistência e a borda HTTP de Goal: estende a interface do repo (find/update),
> implementa o Prisma + contrato, adiciona os UseCases que a rota de edição/listagem precisa
> (`editGoal`, `listActiveGoals`, com TDD), o schema Zod em `shared/` e as rotas
> `POST/GET/PATCH /goals`. Domínio + `createGoal` já existem (Tarefa 29).
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.** Em conflito com esta spec, vale
> aquele arquivo.

## Objetivo

Persistir `Goal` no Postgres e expô-lo via HTTP (criar, listar ativos, editar). A rota valida
com Zod e chama os UseCases; os UseCases contêm a regra. Reaproveitar o padrão de Resource
(Tarefas 27/28).

## Pré-requisitos já prontos (Tarefa 29)

- `src/domain/goal.ts`, `src/usecases/create-goal.ts`.
- `src/usecases/ports/goal-repository.ts` (com `save`/`byId` e `GoalFilter` já declarado).
- `src/usecases/_fakes/goal-repository-fake.ts` (save/byId).

## Parte A — Estender o repository

Acrescentar à interface `GoalRepository` (e ao fake) os métodos que faltam, no molde do
`ResourceRepository`:

```ts
find(filter: GoalFilter): Promise<Goal[]>;   // GoalFilter: { userId, status?, type?, parentId? }
update(id: string, patch: Partial<Goal>): Promise<Goal>;
```

- **Fake**: `find` filtra por `userId`/`status`/`type`/`parentId`; `update` aplica patch e
  lança se id ausente (igual ao resource-fake).
- **Prisma** (`src/repositories/prisma-goal-repository.ts`): espelhar
  `PrismaResourceRepository`. Cuidados específicos do Goal:
  - **`null` vs `undefined`**: a entidade usa `... | null`. No `toDomain`, mapear `?? null`.
  - **`weekdays`**: `Int[]` no Prisma → `number[]` no domínio (default `[]`).
  - **labels N–N** (`GoalLabels`): `connect` no save, `set` no update, `some` no find
    (filtro por label fica para quando precisar; o `GoalFilter` aqui não tem `labelId`, mas o
    `toDomain` traz `labelIds`).
  - **`type`/`period`**: `String` no banco → cast `as Goal['type']` / `as Goal['period']`.
  - **`parentId`** é só uma coluna FK; `toDomain` traz `parentId`, não o objeto pai.

## Parte B — UseCases `editGoal` e `listActiveGoals` (TDD, teste antes)

`src/usecases/list-active-goals.ts`:

```ts
interface ListActiveGoalsInput {
  userId: string;
  type?: GoalType;
  parentId?: string;
}
// retorna goals status='ACTIVE' do usuário; filtros type/parentId opcionais. Só tradução→find.
```

`src/usecases/edit-goal.ts`:

```ts
interface EditGoalInput {
  id: string;
  userId: string; // dono; rejeita editar goal de outro user → GoalNotFoundError (sem vazar)
  title?: string;
  description?: string | null;
  targetValue?: number | null;
  unit?: string | null;
  period?: GoalPeriod | null;
  timesPerPeriod?: number | null;
  weekdays?: number[];
  startAt?: Date | null;
  dueAt?: Date | null;
  labelIds?: string[]; // se presente, SUBSTITUI o conjunto
}
type EditGoalOutput = Goal;
```

Regras do `editGoal` (testar):

1. id inexistente **ou** `userId` ≠ dono → `GoalNotFoundError` (não vaza existência).
2. Patch parcial: só altera campos presentes; `labelIds` presente substitui, ausente mantém.
3. **`type` NÃO é editável** (não há campo no input) — mudar de HABIT para TARGET viraria outro
   bicho; quem erra o tipo recria. (Decisão — ver abaixo.)
4. **`status`/`archivedAt`/`completedAt` NÃO mudam via edit** (arquivar/completar são a Tarefa 31).
5. **Reaplicar a validação de coerência por tipo** ao editar cadência/medida, **com base no
   `type` atual do goal** (carregado do repo). Ex.: se o goal é HABIT e o patch deixaria as duas
   cadências ativas → `InvalidGoalError`; se é TARGET e o patch tenta pôr `weekdays` → erro;
   `targetValue` ≤ 0 → erro. Mesmo conjunto de regras do `createGoal` (Tarefa 29, regras 3 e 4),
   aplicado ao estado resultante (atual + patch).

> Extrair a validação de cadência/medida do `createGoal` para um helper de domínio reutilizável
> (ex.: `src/domain/goal-rules.ts`) e usá-lo nos dois UseCases, evitando duplicar a regra. (Não
> espalhar a regra — convenção do CLAUDE.md.) Se preferir, refatorar o `createGoal` para usar o
> mesmo helper.

`listActiveGoals` não tem regra além de filtrar — teste leve. `editGoal` — TDD cobrindo 1–5.

## Parte C — Schema Zod em `shared/`

`packages/shared/src/goal.ts` (+ export no `index.ts`), no estilo de `shared/src/resource.ts`:

- `goalType` = `z.enum(['HABIT','TARGET','PROJECT','UMBRELLA'])`; `goalPeriod` = `z.enum([...])`.
- `createGoalSchema`: `userId`, `title` (trim min 1), `type`, e os opcionais
  (`description`, `targetValue` (`.positive()` quando presente), `unit`, `period`,
  `timesPerPeriod` (`.int().positive()`), `weekdays` (`z.array(weekday)` — reusar `weekday` de
  `common.ts`), `startAt`/`dueAt` (`z.coerce.date()`), `parentId`, `labelIds`).
  **A exclusividade cadência/medida NÃO se expressa bem em Zod** — fica no UseCase; o Zod só
  garante tipos/formatos.
- `editGoalSchema`: como o create, sem `type`/`parentId` (não editáveis), `userId` obrigatório,
  os demais opcionais.
- `listGoalsQuerySchema`: `userId`, `type?`, `parentId?` (status fixo ACTIVE nesta rota).
- `goalResponseSchema`: todos os campos do `Goal` serializados (datas como
  `z.string().datetime().nullable()`; `weekdays: z.array(weekday)`; `labelIds: z.array(...)`).

## Parte D — Rotas `/goals`

`src/routes/goal-routes.ts` (molde de `resource-routes.ts`), registrar em `http/server.ts`:

- **POST `/goals`** → body `createGoalSchema`; `201: goalResponseSchema`;
  `InvalidGoalError`→400, `GoalNotFoundError`→400 (parent inexistente é erro de input).
- **GET `/goals`** → querystring `listGoalsQuerySchema`; `200: z.array(goalResponseSchema)`
  (lista ativos).
- **PATCH `/goals/:id`** → params `{id}`, body `editGoalSchema`; `200: goalResponseSchema`;
  `GoalNotFoundError`→404, `InvalidGoalError`→400.

`toResponse(g: Goal): GoalResponse` converte datas para ISO (igual ao resource).

## Testes

- **Contrato Prisma** `src/repositories/__tests__/prisma-goal-repository.integration.test.ts`
  (molde do resource): save+byId round-trip (incl. `weekdays`, `parentId`, opcionais `null`);
  byId desconhecido → null; find por status/type/parentId; update patch parcial; update
  `labelIds` substitui; update id inexistente → erro; save de filho com `parentId`.
- **Rotas** `src/routes/__tests__/goal-routes.integration.test.ts` (caminhos críticos):
  POST HABIT válido→201; POST inválido (duas cadências)→400; GET lista ativos; PATCH edita
  título→200; PATCH dono errado→404.
- **Unit**: `list-active-goals.test.ts`, `edit-goal.test.ts` (e o helper de regras, se extraído).

## Decisões que assumi (revisar antes de executar)

- **`type` e `parentId` não são editáveis** (recria-se para mudar). Se quiser permitir mover
  um goal de pai (re-parent) ou trocar tipo, vira regra extra no `editGoal`.
- **GET `/goals` lista só ATIVOS** (sem listar arquivados/completados separadamente nesta
  tarefa). Listagem de arquivados/completados, se necessária, é incremento depois.
- **Extrair `goal-rules.ts`** e refatorar o `createGoal` para usá-lo (mantendo os testes da 29
  verdes). Se preferir não tocar no `createGoal`, duplico a regra só no `editGoal` (pior).

## Arquivos a tocar

- `src/usecases/ports/goal-repository.ts` (+find/update) · `_fakes/goal-repository-fake.ts` (+find/update).
- `src/repositories/prisma-goal-repository.ts` (novo) + teste de contrato (novo).
- `src/usecases/list-active-goals.ts` · `src/usecases/edit-goal.ts` · (`src/domain/goal-rules.ts`) + testes.
- `packages/shared/src/goal.ts` (novo) + `index.ts`.
- `src/routes/goal-routes.ts` (novo) + `src/http/server.ts` (registrar) + teste de rota (novo).
- **Não** tocar: telas, `completeGoal`/`archiveGoal` (Tarefa 31), Event (Bloco K).

## Definição de pronto

- [x] `GoalRepository` estendido (find/update) no fake e no Prisma; contrato verde. (6/6)
- [x] `listActiveGoals` e `editGoal` com testes unit (TDD); `editGoal` reaplica a coerência por
      tipo via helper compartilhado (`domain/goal-rules.ts`, e `createGoal` refatorado p/ usá-lo);
      não toca `type`/`status`/`archivedAt`/`completedAt`.
- [x] Schema Zod de Goal em `shared/`; rotas POST/GET/PATCH `/goals` registradas, erros mapeados.
- [x] Testes de rota (integração) nos caminhos críticos, verdes (5/5); `unit` (173) e
      `integration` (87) verdes.
- [x] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar feito vs definição e **parar**.
