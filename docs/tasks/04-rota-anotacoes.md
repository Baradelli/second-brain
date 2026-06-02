# Tarefa 04 — Rotas `POST /notes` e `GET /notes`

## Objetivo

Expor o UseCase `CreateNote` via HTTP e permitir listar notas, validando com os schemas Zod
de `@cerebro/shared`. O Swagger sai automaticamente do schema.

## Camada(s)

Rota/Controller (Fastify) → UseCase → Repository (Prisma, da Tarefa 03).

## Pré-requisitos

- Tarefas 01–03 concluídas.
- `createNoteSchema` já existe em `@cerebro/shared` (veio no esqueleto).

## Convenção de idioma

Código/identificadores/rotas em **inglês**. Mensagens ao usuário (se houver) via i18n no
front — a API responde dados, não texto traduzido.

## Contrato HTTP

```
POST /notes
  body: createNoteSchema   (userId, type, scope?, date, title?, doc, ...)
  201 → Note criada (com id, plainText, status, createdAt)
  400 → erro de validação Zod (automático)

GET /notes?type=&scope=&from=&to=&status=
  query: schema Zod com todos opcionais (mapeia para NoteRepository.find)
  200 → Note[]
```

> Enquanto não há auth (MVP 1), o `userId` vem no body/query usando o usuário fixo "owner"
> do seed. A auth real é decisão posterior (ver plano).

## Como montar (wiring)

- Instanciar `PrismaNoteRepository` com o `PrismaClient`.
- Injetar no `CreateNote`.
- Registrar as rotas num plugin `noteRoutes(app)` e dar `app.register(noteRoutes)` no
  `server.ts` (hoje há um TODO marcando o lugar).
- Usar o `ZodTypeProvider` já configurado: declarar `schema: { body: createNoteSchema }` e
  o Fastify valida + documenta sozinho.

## Schemas a adicionar em `shared`

- `listNotesQuerySchema` (todos os campos opcionais: `type`, `scope`, `from`, `to`,
  `status`) — reaproveitar `noteType`/`noteScope` já existentes.
- (Opcional) `noteResponseSchema` para tipar a saída no Swagger.

## Testes a escrever (integração — caminhos críticos)

1. `POST /notes` com body válido → 201 e corpo com `id`/`plainText`/`status:"ACTIVE"`.
2. `POST /notes` com `type` inválido → 400 (validação Zod barra antes do UseCase).
3. `GET /notes?type=DEVOTIONAL` → retorna só as do tipo.
4. `GET /notes?from=&to=` → respeita o intervalo.

> Teste de rota usa `app.inject` do Fastify (sem subir porta). Pode usar o
> `PrismaNoteRepository` real (integration) ou o fake — prefira o real aqui, é caminho crítico.

## Arquivos a tocar

- `packages/shared/src/note.ts` (adicionar `listNotesQuerySchema`).
- `packages/backend/src/routes/note-routes.ts`.
- `packages/backend/src/routes/__tests__/note-routes.integration.test.ts`.
- `packages/backend/src/http/server.ts` (registrar `noteRoutes` no lugar do TODO).

## Fora de escopo

- NÃO implementar editar/buscar-do-dia (Tarefa 05).
- NÃO lidar com labels/anexos na rota ainda.
- NÃO criar auth.

## Definição de pronto

- [x] `POST /notes` e `GET /notes` funcionando, validados por Zod.
- [x] Swagger em `/docs` mostra as duas rotas com os schemas.
- [x] 4 testes de rota passando (5 no total, +1 para campos faltando).
- [x] Rota não contém regra de negócio (só valida e chama o UseCase).
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
