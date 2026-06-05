# Tarefa 28 — `listResources` + Schema Zod de Resource em `shared/` + rotas `/resources`

> Fecha a fatia de Resource: o UseCase de listagem (TDD com fake), o **primeiro schema Zod do
> MVP 2 em `packages/shared/`** (um schema valida, tipa e documenta — convenção do projeto) e
> as rotas REST que ligam tudo ponta a ponta. Domínio/UseCase já existem (26), Prisma já
> existe (27).
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.** Em conflito com esta spec, vale
> aquele arquivo.

## Objetivo

Expor `Resource` via HTTP: criar, listar (com filtro por `stage`/`label`/`status`) e editar.
A borda (rota) valida com Zod e chama os UseCases; os UseCases já contêm a regra (não mudam
de assinatura). O schema Zod nasce em `shared/` e é a única fonte de verdade da borda.

## Pré-requisitos já prontos (não recriar/alterar)

- `src/domain/resource.ts` (entidade), `src/usecases/create-resource.ts`,
  `src/usecases/edit-resource.ts` (Tarefa 26).
- `src/usecases/ports/resource-repository.ts`, `_fakes/resource-repository-fake.ts`,
  `src/repositories/prisma-resource-repository.ts` (Tarefas 26/27).

**Importante:** os UseCases `CreateResource`/`EditResource` recebem input já **tipado** e
mantêm sua validação defensiva. Esta tarefa **não** altera a assinatura deles — a rota valida
com Zod na borda e passa o input tipado. (Difere de `CreateCapture`, que faz `schema.parse`
internamente; aqui a guarda da borda é a rota e o UseCase mantém só a defesa de domínio.)

## Parte A — Schema Zod em `shared/` (primeiro do MVP 2)

Novo arquivo `packages/shared/src/resource.ts`, exportado em `packages/shared/src/index.ts`
(adicionar `export * from './resource.js';`). Seguir o estilo de `shared/src/capture.ts`
(schemas de input, de query e de response separados; `z.infer` para os tipos).

```ts
import { z } from 'zod';

export const resourceType = z.enum([
  'book',
  'course',
  'video',
  'article',
  'podcast',
  'other',
]);
export type ResourceTypeInput = z.infer<typeof resourceType>;

export const resourceStage = z.enum(['backlog', 'in_progress', 'done']);
export type ResourceStageInput = z.infer<typeof resourceStage>;

export const createResourceSchema = z.object({
  userId: z.string().min(1),
  title: z.string().trim().min(1),
  type: resourceType,
  url: z.string().url().nullish(),
  author: z.string().nullish(),
  description: z.string().nullish(),
  labelIds: z.array(z.string()).optional(),
});
export type CreateResourceBody = z.infer<typeof createResourceSchema>;

export const editResourceSchema = z.object({
  userId: z.string().min(1), // dono; usado pelo UseCase para rejeitar edição de terceiro
  title: z.string().trim().min(1).optional(),
  type: resourceType.optional(),
  url: z.string().url().nullish(),
  author: z.string().nullish(),
  description: z.string().nullish(),
  stage: resourceStage.optional(),
  labelIds: z.array(z.string()).optional(),
});
export type EditResourceBody = z.infer<typeof editResourceSchema>;

export const listResourcesQuerySchema = z.object({
  userId: z.string().min(1),
  stage: resourceStage.optional(),
  labelId: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});
export type ListResourcesQuery = z.infer<typeof listResourcesQuerySchema>;

export const resourceResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  type: resourceType,
  url: z.string().nullable(),
  author: z.string().nullable(),
  description: z.string().nullable(),
  stage: resourceStage,
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  labelIds: z.array(z.string()),
});
export type ResourceResponse = z.infer<typeof resourceResponseSchema>;
```

> Nota de nomes: para não colidir com os tipos do domínio (`ResourceType`/`ResourceStage` em
> `backend/src/domain/resource.ts`), os tipos inferidos do shared usam sufixo (`...Input`,
> `...Body`). Os valores do enum são os mesmos — o domínio e o shared concordam, mas cada
> camada mantém seu tipo. Não importar tipos de domínio no `shared/`.

## Parte B — UseCase `listResources` (TDD com fake, escrever teste primeiro)

`src/usecases/list-resources.ts`:

```ts
export interface ListResourcesInput {
  userId: string;
  stage?: ResourceStage; // tipo do domínio
  labelId?: string;
  status?: 'ACTIVE' | 'ARCHIVED'; // default 'ACTIVE'
}
```

Regras (o que os testes provam, fake repo):

1. Sem filtros além de `userId` → retorna os recursos **ACTIVE** daquele usuário (default
   `status='ACTIVE'`; arquivados não aparecem sem pedir).
2. `status='ARCHIVED'` → retorna só arquivados.
3. `stage` filtra por estágio.
4. `labelId` filtra por label (recurso cujo conjunto inclui a label).
5. Filtros combinam (ex.: `stage='done'` + `labelId`).
6. Nunca retorna recurso de outro `userId`.

Implementação: monta o `ResourceFilter` (aplicando o default `ACTIVE`) e delega a
`repo.find`. Sem lógica nova — só tradução input→filtro.

Teste: `src/usecases/__tests__/list-resources.test.ts` (project `unit`, fake repo), red→green.

## Parte C — Rotas `/resources`

`src/routes/resource-routes.ts`, no molde de `capture-routes.ts`
(`FastifyPluginAsyncZod<{ prisma }>`, instancia repo + UseCases, `toResponse`):

- **POST `/resources`** → body `createResourceSchema`, response `201: resourceResponseSchema`.
  Chama `CreateResource`. Retorna o recurso criado (`stage='backlog'`, `status='ACTIVE'`).
- **GET `/resources`** → querystring `listResourcesQuerySchema`,
  response `200: z.array(resourceResponseSchema)`. Chama `ListResources`.
- **PATCH `/resources/:id`** → params `{ id: z.string() }`, body `editResourceSchema`,
  response `200: resourceResponseSchema`. Monta `{ id: req.params.id, ...req.body }` e chama
  `EditResource`. (Erro de dono/inexistente vira `ResourceNotFoundError` no UseCase.)

`toResponse(r: Resource): ResourceResponse` converte datas para ISO (`archivedAt` → `null` ou
ISO; `createdAt` → ISO), igual ao `toResponse` do capture.

Registrar em `src/http/server.ts`:
`await app.register(resourceRoutes, { prisma });` (junto dos demais registros).

### Tratamento de erro (mínimo, no padrão atual)

Verificar como as rotas atuais lidam com `*NotFoundError` (ex.: `note-routes`/`label-routes`)
e seguir o mesmo padrão para `ResourceNotFoundError` → 404 e `InvalidResourceError` → 400.
Se o projeto ainda não tem um error handler central, fazer o mínimo coerente com o existente
(não inventar um framework de erros novo nesta tarefa).

## Parte D — Testes de rota (integração, só caminhos críticos)

`src/routes/__tests__/resource-routes.integration.test.ts`, no molde de
`capture-routes.integration.test.ts` (usa `buildServer()` + `app.inject`, user seed `owner`):

1. **POST** válido → 201, `stage='backlog'`, `status='ACTIVE'`, id presente.
2. **POST** inválido (sem `title` ou `type` fora do enum) → **400** (Zod rejeita na borda).
3. **GET** lista do usuário, filtrando por `stage` (cria 2, filtra 1).
4. **PATCH** edita `stage`/`title` → 200 com os campos atualizados.
5. **PATCH** com `userId` ≠ dono → **404** (não vaza existência).

Política do `CLAUDE.md`: integração só nos caminhos críticos — não exaustivo.

## Arquivos a tocar

- `packages/shared/src/resource.ts` (novo) + `packages/shared/src/index.ts` (export).
- `packages/backend/src/usecases/list-resources.ts` (novo).
- `packages/backend/src/usecases/__tests__/list-resources.test.ts` (novo).
- `packages/backend/src/routes/resource-routes.ts` (novo).
- `packages/backend/src/http/server.ts` (registrar a rota).
- `packages/backend/src/routes/__tests__/resource-routes.integration.test.ts` (novo).
- **Não** alterar: domínio, `create-resource`/`edit-resource`, repo Prisma, fake, port.

## Fora de escopo

- Arquivar/desarquivar Resource (a rota só lista ACTIVE/ARCHIVED via filtro; não há ação de
  arquivar nesta tarefa — quando entrar, é UseCase próprio).
- Goal/Event (Bloco J em diante).
- Promoção de captura para resource (Tarefa 37).
- Qualquer tela (Tarefa 39).

## Definição de pronto

- [x] `shared/src/resource.ts` criado e exportado no index; schemas de create/edit/list/response.
- [x] `listResources` implementado com teste unit escrito **antes**, cobrindo as 6 regras
      (default ACTIVE, filtros stage/label/status, isolamento por usuário). (6/6)
- [x] Rotas POST/GET/PATCH `/resources` registradas no `server.ts`, validando com os schemas.
- [x] Erros mapeados no padrão existente (`ResourceNotFoundError`→404, `InvalidResourceError`→400).
- [x] Testes de rota (integração) cobrindo os 5 caminhos críticos, verdes. (5/5)
- [x] `unit` (140) e `integration` (76) verdes; sem alterar domínio/UseCases de create/edit/repo.
- [x] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar feito vs definição e **parar**
      (não emendar a 29).
