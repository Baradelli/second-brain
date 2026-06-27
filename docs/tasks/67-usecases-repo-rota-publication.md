# Tarefa 67 — UseCases + Repository + Zod + Rotas de `Publication` (Bloco O)

> TDD nos UseCases (fake repo), depois Prisma + contrato + Zod em `shared/` + rotas. Mirror de
> 26/27/28 (Resource). Domínio pronto na 66.
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.**

## UseCases (TDD estrito, fake repo)

- `createPublication` — `{ userId, sourceType, sourceId, format, title, noteId?, labelIds? }` →
  `stage='idea'`, `status='ACTIVE'`, `publishedAt=null`. Valida `format`/`sourceType` (enum),
  `title` não-vazio. `sourceId` não-vazio.
- `editPublication` — patch parcial de `title`, `format`, `noteId`, `labelIds` e **`stage`**.
  Regra-chave: ao mover `stage → 'published'`, setar `publishedAt = now` (se ainda nulo); ao sair
  de `published`, **manter** `publishedAt` (histórico). Owner ≠ → `PublicationNotFoundError`
  (não vaza). **Não** mexe em `status`/`archivedAt`.
- `archivePublication` — soft delete (`status='ARCHIVED'` + `archivedAt`), idempotente.
- `listPublications` — filtro `{ userId, stage?, format?, status?(default ACTIVE) }`.

Erros novos: `PublicationNotFoundError`, `InvalidPublicationError`.

Regras provadas por teste (≈12): defaults na criação; enum inválido → erro; título vazio → erro;
patch parcial; `published` seta `publishedAt` uma vez; edit não toca `status`; archive idempotente;
listagem filtra por stage/format/status e não vaza outro user.

## Repository (`PublicationRepository`: save/byId/find/update) + fake + Prisma + contrato

Mirror de `prisma-resource-repository.ts`: `labelIds` via connect (save) / set (update); `noteId`
nullable; `find` por userId/stage/format/status. Contrato de integração mirror da 27.

## Zod em `shared/publication.ts` (+ index)

`publicationFormat`, `publicationStage`, `publicationSourceType`, `createPublicationSchema`,
`editPublicationSchema` (inclui `stage?`), `listPublicationsQuerySchema`,
`publicationResponseSchema` (datas ISO). Tipos exportados.

## Rotas (`publication-routes.ts`, registrar no `server.ts` autenticado)

- `POST /publications` → 201.
- `GET /publications` (query stage/format/status) → 200 array.
- `GET /publications/:id` → 200 | 404.
- `PATCH /publications/:id` → 200 | 400 | 404 (edita incl. `stage`; auto `publishedAt`).
- `POST /publications/:id/archive` → 200.

`userId` de `req.user.sub`; mapear `PublicationNotFoundError`→404, `InvalidPublicationError`→400.
Integração nos caminhos críticos (criar; avançar para published seta publishedAt; dono errado→404).

## Frontend (contrato)

`endpoints.ts`: `createPublication`, `listPublications`, `getPublication`, `editPublication`,
`archivePublication` (tipos `Omit<…,'userId'>`). Sem tela aqui (69).

## Fora de escopo

- Gatilho a partir de fontes (68). Tela de pipeline (69). IA (Bloco P).

## Definição de pronto

- [x] UseCases com testes (fake) cobrindo as regras (incl. `publishedAt`). (26 testes: create 7, edit 10, archive 4, list 5)
- [x] Repository Prisma + contrato verdes; Zod em `shared/`. (`prisma-publication-repository` + 11 testes de contrato; `shared/publication.ts`)
- [x] Rotas registradas + integração nos caminhos críticos; endpoints no frontend. (`publication-routes` + 6 testes; `endpoints.ts`)
- [x] `unit` + `integration` verdes; sem tela. Marcar BACKLOG. (368 unit / 169 integration)
