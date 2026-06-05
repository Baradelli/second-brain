# Tarefa 35 — Repository de `Event` (Prisma + contrato) + rotas de check/skip/undo

> Fecha o **Bloco K**. Implementa o `EventRepository` no Prisma (incl. o **hard delete** do
> undo), com teste de contrato, e expõe as ações via HTTP: checar, pular e desfazer check.
> Domínio + UseCases já existem (Tarefas 32–34). Reaproveita o padrão de Resource/Goal.
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.** Em conflito com esta spec, vale aquele
> arquivo.

## Objetivo

Persistir `Event` no Postgres e expor check/skip/undo via rota. A rota valida com Zod e chama
os UseCases; os UseCases contêm a regra.

## Pré-requisitos prontos (Tarefas 32–34)

- `src/domain/event.ts`, `src/usecases/check-goal.ts`, `src/usecases/undo-check.ts`,
  `src/usecases/skip-goal.ts`, `src/usecases/compute-goal-progress.ts`.
- `src/usecases/ports/event-repository.ts` (save/byId/delete/find) + fake.

## Parte A — Impl Prisma

`src/repositories/prisma-event-repository.ts`, espelhando os outros repos. Particularidades:

- **Sem labels** (Event não tem N–N) — mais simples que Resource/Goal.
- **`toDomain`**: `value`/`reason` → `?? null`. `type` é `String` no banco → cast
  `as Event['type']`.
- **`delete(id)`**: `prisma.event.delete({ where: { id } })` — **hard delete real** (a exceção
  documentada). Se quiser, tolerar id inexistente (não é erro grave no undo) — mas o UseCase já
  valida existência antes, então o `delete` direto basta.
- **`find(filter)`**: `where` com `userId` sempre; `goalId` (igualdade) **ou** `goalIds`
  (`{ in: goalIds }`); `type`; janela `occurredAt` `gte`/`lte` (ambos inclusivos), igual ao
  `PrismaNoteRepository` faz com `date`.

## Parte B — Schema Zod em `shared/`

`packages/shared/src/event.ts` (+ export no `index.ts`):

- `checkGoalSchema`: `{ userId: z.string().min(1), value: z.number().positive().nullish(),
occurredAt: z.coerce.date().optional() }`.
- `skipGoalSchema`: `{ userId: z.string().min(1), reason: z.string().trim().min(1),
occurredAt: z.coerce.date().optional() }`.
- `undoCheckSchema` (body do DELETE/undo): `{ userId: z.string().min(1) }`.
- `eventResponseSchema`: `{ id, userId, goalId, type: z.enum(['done','skip']),
value: z.number().nullable(), reason: z.string().nullable(),
occurredAt: z.string().datetime(), createdAt: z.string().datetime() }`.
- (Opcional, ver decisão) `goalProgressResponseSchema` se expusermos a rota de progresso.

## Parte C — Rotas

`src/routes/event-routes.ts` (ou acrescentar a `goal-routes.ts` — ver decisão), registrar no
`http/server.ts`:

- **POST `/goals/:id/check`** → params `{id}` (é o `goalId`), body `checkGoalSchema`;
  `201: eventResponseSchema`; `GoalNotFoundError`→404, `InvalidCheckError`→400.
- **POST `/goals/:id/skip`** → params `{id}`, body `skipGoalSchema`;
  `201: eventResponseSchema`; `GoalNotFoundError`→404, `InvalidCheckError`→400.
- **DELETE `/events/:id`** → params `{id}` (é o `eventId`), body `undoCheckSchema`;
  `204` (sem corpo); `EventNotFoundError`→404, `InvalidCheckError`→400 (tentou desfazer skip).

`toResponse(e: Event): EventResponse` converte `occurredAt`/`createdAt` para ISO.

## Parte D — Rota de progresso (decisão)

A Tarefa 34 entregou `computeGoalProgress`, mas nenhuma rota o expõe ainda. Proponho **incluir
aqui**:

- **GET `/goals/:id/progress`** → query `{ userId, reference? }`;
  `200: goalProgressResponseSchema`; `GoalNotFoundError`→404.

Se preferir deixar o progresso só para quem o consome (agenda/fechar-o-dia, 36/38), removo esta
parte e o `goalProgressResponseSchema`.

## Testes

- **Contrato Prisma** `src/repositories/__tests__/prisma-event-repository.integration.test.ts`:
  save+byId round-trip (`done` com `value`; `skip` com `reason`); `delete` remove de fato
  (byId→null depois); `find` por `goalId`/`goalIds`/`type` e por janela `occurredAt` (bordas
  inclusivas); byId desconhecido → null.
- **Rotas** `src/routes/__tests__/event-routes.integration.test.ts` (caminhos críticos):
  `POST /goals/:id/check` (TARGET com value)→201; check em UMBRELLA→400; `POST /goals/:id/skip`
  sem reason→400 (Zod) e com reason→201; `DELETE /events/:id`→204 e depois o evento sumiu;
  desfazer skip→400. (Se incluir progresso: `GET /goals/:id/progress`→200.)

## Decisões que assumi (revisar antes de executar)

- **`DELETE /events/:id` com body `{ userId }`** para autorizar o dono. Alternativa: `userId`
  na query. Mantive no body por consistência com as outras ações.
- **Incluir `GET /goals/:id/progress`** (Parte D). Removo se preferir adiar.
- **Arquivo de rotas separado `event-routes.ts`** (check/skip vivem sob `/goals/:id`, mas são
  ações de Event). Se preferir tudo em `goal-routes.ts`, junto lá.

## Arquivos a tocar

- `src/repositories/prisma-event-repository.ts` + teste de contrato (novos).
- `packages/shared/src/event.ts` (novo) + `index.ts`.
- `src/routes/event-routes.ts` (novo) + `src/http/server.ts` (registrar) + teste de rota.
- **Não** tocar: domínio/UseCases (prontos), telas.

## Fora de escopo

- Fechar o dia (36), promover captura p/ goal (37), agenda com objetivos (38), telas (Bloco M).
- Migrar `Event.type` para enum Prisma (só quando estabilizar — HANDOFF §7).

## Definição de pronto

- [ ] `PrismaEventRepository` (save/byId/**delete real**/find com janela e goalIds); contrato verde.
- [ ] Schema Zod de Event em `shared/`; rotas check/skip/undo registradas, erros mapeados
      (404/400; 204 no undo).
- [ ] (Se aprovado) `GET /goals/:id/progress` + schema.
- [ ] Testes de rota e de contrato nos caminhos críticos; `unit` e `integration` verdes.
- [ ] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar feito vs definição e **parar**.
