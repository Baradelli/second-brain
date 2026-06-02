# Tarefa 11 — Rotas de Capture (`POST /captures`, `GET /captures?status=`)

## Objetivo

Expor a criação de capturas e a listagem (pendentes / arquivadas) via HTTP, validando com
Zod e documentando no Swagger.

## Camada(s)

Rota/Controller → UseCases (CreateCapture, ListPendingCaptures, ListArchived) → Repository.

## Pré-requisitos

- Tarefas 08–10.
- Padrão de rotas já estabelecido na Tarefa 04 (mesmo estilo).

## Convenção de idioma

Código/identificadores/rotas em **inglês**.

## Contrato HTTP

```
POST /captures
  body: createCaptureSchema
  201 → Capture criada
  400 → validação Zod

GET /captures?status=PENDING|ARCHIVED
  query: listCapturesQuerySchema (status obrigatório ou default PENDING)
  200 → Capture[]
  - status=PENDING  → ListPendingCaptures (usa "agora" + timezone do usuário)
  - status=ARCHIVED → ListArchived
```

> `userId` vem do usuário fixo "owner" do seed enquanto não há auth (MVP 1). O `timezone`
> para o cálculo do "hoje" vem de Settings desse usuário.

## Schemas em `shared`

- `listCapturesQuerySchema` (`status` ∈ {PENDING, ARCHIVED}, default PENDING).
- (Opcional) `captureResponseSchema` para o Swagger.

## Wiring

- Instanciar `PrismaCaptureRepository` + `SettingsReader` (Prisma) e injetar nos UseCases.
- Plugin `captureRoutes(app)`, registrado no `server.ts` (junto do `noteRoutes`).

## Testes (integração, caminhos críticos — `app.inject`)

1. `POST /captures` válido → 201, `status: 'PENDING'`, `reviewAt` calculado quando ausente.
2. `POST /captures` com `text` vazio → 400.
3. `GET /captures?status=PENDING` → fila a revisar (respeita o "hoje").
4. `GET /captures?status=ARCHIVED` → só arquivadas.

## Arquivos a tocar

- `packages/shared/src/capture.ts` (+ `listCapturesQuerySchema`).
- `packages/backend/src/routes/capture-routes.ts`.
- `packages/backend/src/routes/__tests__/capture-routes.integration.test.ts`.
- `packages/backend/src/http/server.ts` (registrar `captureRoutes`).

## Fora de escopo

- NÃO implementar promover/arquivar (Bloco D — Tarefas 12/13).
- NÃO auth.

## Definição de pronto

- [x] `POST /captures` e `GET /captures?status=` funcionando e validados por Zod.
- [x] Swagger em `/docs` mostra as rotas.
- [x] 5 testes de rota passando (3 POST + 2 GET).
- [x] Rota sem regra de negócio (só valida e chama UseCase).
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
