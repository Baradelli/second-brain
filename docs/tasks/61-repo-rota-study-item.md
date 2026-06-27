# Tarefa 61 — Persistência (Prisma) + Schemas Zod + Rotas de `StudyItem`/`Recall`

> Fecha a borda do motor: implementa os repositórios Prisma (+ contrato), os schemas Zod em
> `shared/` e as rotas Fastify. Mirror das Tarefas 27/28/30/35. Domínio/UseCases já prontos (59/60).
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.**

## Objetivo

Tornar o motor acessível via API, ligando os UseCases (`createStudyItem`, `editStudyItem`,
`archiveStudyItem`, `logRecall`, `undoRecall`) ao Prisma e ao Fastify, com Zod em `shared/` como
fonte única de validação/tipos.

## Schemas Zod (`packages/shared/src/study-item.ts`, + export no index)

- `studyItemStatus = z.enum(['ACTIVE','ARCHIVED','CONSOLIDATED'])`
- `recallConfidence = z.enum(['A','B','C'])`
- `studyQuestionsSchema = z.object({ before: string[], during: string[], after: string[] })` (todas
  default `[]`); no input aceita parcial (`.partial()`).
- `createStudyItemSchema` { userId, title(trim,min1), resourceId?, reference?, questions?(partial), fichamentoNoteId?, labelIds? }
- `editStudyItemSchema` { userId, title?, resourceId?(nullable), reference?(nullable), questions?(partial), fichamentoNoteId?(nullable), labelIds? }
- `listStudyItemsQuerySchema` { userId, status?(default ACTIVE), resourceId?, labelId? }
- `logRecallSchema` { userId, confidence, note?, occurredAt?(coerce date) }
- `recallScheduleResponseSchema` { index, consolidated, nextRecallAt: string|null, dueToday, overdue }
- `studyItemResponseSchema` { id, userId, resourceId|null, title, reference|null, questions|null,
  fichamentoNoteId|null, status, archivedAt: string|null, createdAt: string, labelIds, **schedule** }
- `recallResponseSchema` { id, userId, studyItemId, confidence, note|null, occurredAt, createdAt }

> Datas como ISO string no response (convenção). `schedule` é **calculado** (Tarefa 60), embutido no
> response para a UI mostrar "próxima revisão / devida hoje" sem chamada extra.

## Port + fake: acrescentar `find` a `StudyItemRepository`

`StudyItemFilter { userId; status?; resourceId?; labelId? }` + `find(filter): Promise<StudyItem[]>`.
Atualizar o fake (`study-item-repository-fake.ts`) com `find`. (`RecallRepository` já tem `find`.)

## UseCase de leitura

`ListStudyItems` (`list-study-items.ts`) — recebe `StudyItemRepository`, devolve `find(filter)`.
Teste de UseCase com fake (filtra por status/resourceId/labelId). TDD.

## Prisma repositories

- `prisma-study-item-repository.ts`: `save`/`byId`/`find`/`update`. `questions` ↔ JSON
  (`as unknown`), `labelIds` ↔ relação `StudyItemLabels` (connect no save, set no update — mirror
  de Resource). `find` filtra por userId/status/resourceId/labelId (labels `some`).
- `prisma-recall-repository.ts`: `save`/`byId`/`delete`/`find` (filtra por userId/studyItemId/studyItemIds).

## Contrato (integration tests, banco real, mirror de 27/35)

- `prisma-study-item-repository.integration.test.ts`: round-trip save/byId (incl. `questions` JSON e
  `null`s), labels connect/set, `find` por status/resourceId/labelId, `update` parcial.
- `prisma-recall-repository.integration.test.ts`: save/byId, `find` por studyItemId, `delete`.

## Rotas (`study-item-routes.ts`, registrar no `server.ts` dentro do escopo autenticado)

Helper `toResponse(item, schedule)` e `recallToResponse(recall)`. Computa `schedule` via
`computeRecallSchedule` (recalls do item via `RecallRepository.find` + timezone do `SettingsReader`).

- `POST /study-items` → 201 `studyItemResponseSchema` (body `createStudyItemSchema.omit(userId)`).
- `GET /study-items` → 200 array (query `listStudyItemsQuerySchema.omit(userId)`); cada item com schedule.
- `GET /study-items/:id` → 200 | 404.
- `PATCH /study-items/:id` → 200 | 400 | 404 (`editStudyItemSchema.omit(userId)`).
- `POST /study-items/:id/archive` → 200.
- `POST /study-items/:id/recalls` → 201 `recallResponseSchema` (body `logRecallSchema.omit(userId)`);
  mapeia `StudyItemNotFoundError`→404, `InvalidRecallError`→400.
- `DELETE /recalls/:id` → 204 | 404 (`undoRecall`).

`userId` sempre de `req.user.sub`. Mapear `StudyItemNotFoundError`→404, `InvalidStudyItemError`→400.

## Route integration test (mirror de resources/events)

`study-item-routes.integration.test.ts`: criar → 201; listar; logar recall → 201 e o schedule do
item avança; arquivar; dono errado → 404; confidence inválida → 400.

## Fora de escopo

- Agenda `recallsDue` (Tarefa 62). Telas (63–65).

## Definição de pronto

- [x] Schemas Zod em `shared/` + export no index.
- [x] `StudyItemRepository.find` + fake; `ListStudyItems` + teste (3).
- [x] Prisma repos (StudyItem + Recall) + contratos verdes (5 + 3).
- [x] Rotas registradas em `server.ts` e cobertas por integração (6 testes), `schedule` embutido.
- [x] `unit` (336) + `integration` (151) verdes; sem tela tocada.
- [x] Marcar BACKLOG + esta definição, reportar e seguir (parte do Bloco N).
