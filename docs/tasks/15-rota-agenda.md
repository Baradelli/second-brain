# Tarefa 15 — Rota `GET /agenda?day=today` (+ rotas de revisão)

## Objetivo

Expor a agenda do dia via HTTP e, de quebra, as ações de triagem que ficaram sem rota no
Bloco D (arquivar e promover captura) — pois a tela de revisão (Bloco G) vai precisar delas.

## Camada(s)

Rota/Controller → UseCases (BuildTodayAgenda, ArchiveCapture, PromoteCaptureToNote).

## Pré-requisitos

- Tarefas 12, 13, 14.

## Convenção de idioma

Código/identificadores/rotas em **inglês**.

## Contrato HTTP

```
GET /agenda?day=today
  200 → TodayAgenda (journal + capturesToReview)
  - "today" é o único valor no MVP 1; o param existe para futuro (?day=2026-06-01).

POST /captures/:id/archive
  body: { reason?: string }
  200 → Capture arquivada

POST /captures/:id/promote
  body: { type: NoteType, scope?: NoteScope, title?: string }
  201 → { note, capture }   (promove para Note — único destino no MVP 1)
```

> `userId`/`timezone` do usuário fixo "owner" (sem auth no MVP 1). `reference` = agora.

## Schemas em `shared`

- `promoteCaptureSchema` (`type`, `scope?`, `title?`).
- `archiveCaptureSchema` (`reason?`).
- (Opcional) `todayAgendaSchema` para o Swagger.

## Wiring

- Instanciar os repos Prisma + `SettingsReader` e injetar nos UseCases.
- Plugins `agendaRoutes` e (estender) `captureRoutes` com as ações; registrar no `server.ts`.

## Testes (integração, `app.inject`)

1. `GET /agenda?day=today` → 200 com `journal` e `capturesToReview`.
2. `POST /captures/:id/archive` → 200, captura some da fila e a agenda reflete.
3. `POST /captures/:id/promote` → 201, cria Note e captura vira PROCESSED.
4. `promote` com `type` inválido → 400 (Zod).

## Arquivos a tocar

- `packages/shared/src/capture.ts` (+ `promoteCaptureSchema`, `archiveCaptureSchema`).
- `packages/backend/src/routes/agenda-routes.ts`.
- `packages/backend/src/routes/capture-routes.ts` (adicionar archive/promote).
- `packages/backend/src/routes/__tests__/agenda-routes.integration.test.ts`.
- `packages/backend/src/http/server.ts` (registrar `agendaRoutes`).

## Fora de escopo

- NÃO objetivos/eventos na agenda (MVP 2).
- NÃO promover para resource/goal.
- NÃO auth.

## Definição de pronto

- [x] `GET /agenda?day=today` retorna o pacote agregado.
- [x] `archive` e `promote` expostos e validados por Zod.
- [x] Swagger mostra as rotas novas.
- [x] 4 testes de integração passando.
- [x] Com isso, o backend do MVP 1 (Blocos A–E) está completo — falta só o frontend (Bloco G) e offline (H).
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
