# Tarefa 54 — G2: rotas protegidas por token (backend)

> **Bloco G — Autenticação**, parte 2. Todas as rotas (menos `/auth/login`, `/health`, `/docs`,
> `/uploads/*` estáticos) passam a exigir **JWT (Bearer)**, e o `userId` deixa de vir por
> parâmetro/body — vem do **token** (`req.user.sub`).

## Como ficou

- **Escopo protegido** no `server.ts`: as rotas de domínio são registradas dentro de um plugin
  encapsulado com um hook `onRequest` que faz `req.jwtVerify()` (401 se faltar/for inválido).
  Públicas: `/auth/login`, `/health`, `/docs*` (swagger), `/uploads/*` (estático). O **POST
  /uploads** fica protegido.
- **Augment de tipo**: `FastifyJWT` declara `payload`/`user` = `{ sub: string }`.
- **Por rota**: o `userId` saiu do schema de request (`SCHEMA.omit({ userId: true })`) e o handler
  usa `req.user.sub`. Usecases não mudaram (recebem `userId` como antes, agora vindo do token).
  Tocadas: note, calendar, day-closing, agenda, goal, event, resource, label, capture, search,
  recap, attachment.
- **Testes de integração**: helper `injectAuth(...)` por arquivo assina um JWT do usuário de teste
  e injeta `Authorization: Bearer`. Testes cross-user (goal/label/resource) passaram a usar um
  **token de outro `sub`** em vez de `userId` no body; o de attachment cria a nota do outro dono
  via token próprio. Novo caso: sem token → **401**.

## Limitação consciente (anotada)

Rotas por **id** (`GET/PATCH /notes/:id`, guide-questions, etc.) ainda não checam dono do recurso
(só exigem token). Em single-user é inócuo; **endurecer ownership por recurso** fica como melhoria
futura.

## Definição de pronto

- [x] Escopo protegido + `jwtVerify`; públicas preservadas; augment de tipo.
- [x] `userId` por token em todas as rotas que o usavam (`.omit` + `req.user.sub`).
- [x] Testes de integração adaptados (helper de auth; cross-user por token; 401 sem token).
- [x] Backend unit **293** + integração **131** verdes; typecheck limpo; lint ok.
- [x] G3 (front: login, guardar token, header Bearer, 401→logout) a seguir.
