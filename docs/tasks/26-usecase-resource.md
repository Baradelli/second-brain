# Tarefa 26 — Domínio + UseCase `createResource` / `editResource`

> Primeira tarefa com **TDD estrito** do MVP 2. Domínio mínimo da fatia + os dois UseCases,
> com testes escritos **antes** da implementação, contra o **Repository fake em memória**.
> Sem Prisma, sem Fastify aqui. Ver `CLAUDE.md` (camadas + TDD outside-in).

## Objetivo

Permitir criar e editar um `Resource` (livro/curso/vídeo/etc.) com a regra de negócio da
camada de aplicação, isolada de persistência e transporte. A rota e a impl Prisma chegam
nas tarefas 27 e 28.

## Decisões já tomadas (não reabrir)

- **`createResource`**: `stage` nasce sempre `"backlog"`; `status` nasce `ACTIVE`. Não se
  cria um recurso já "lido" — o caminho é criar e depois avançar o `stage`.
- **`editResource`**: edita `title`, `type`, `url`, `author`, `description`, `stage` e
  `labelIds`. **NÃO** mexe em `status`/`archivedAt` — arquivar é UseCase separado (Tarefa 31
  cuida do padrão archive; para Resource o archive entra junto da 28/rotas se necessário,
  mas **não** dentro do `editResource`). Mantém simetria editar ≠ arquivar do MVP 1.
- **`type`** ∈ `book | course | video | article | podcast | other` (z.enum).
- **`stage`** ∈ `backlog | in_progress | done` (z.enum).

## Mini-domínio (só desta fatia)

Entidade simples (DDD-lite, sem value objects). Tipos em `backend/src/domain/resource/`:

```ts
export type ResourceType =
  | 'book'
  | 'course'
  | 'video'
  | 'article'
  | 'podcast'
  | 'other';
export type ResourceStage = 'backlog' | 'in_progress' | 'done';
export type GeneralStatus = 'ACTIVE' | 'ARCHIVED'; // já existe no domínio do MVP 1; reusar

export interface Resource {
  id: string;
  userId: string;
  title: string;
  type: ResourceType;
  url: string | null;
  author: string | null;
  description: string | null;
  stage: ResourceStage;
  status: GeneralStatus;
  archivedAt: Date | null;
  createdAt: Date;
  labelIds: string[]; // vínculo resolvido no repo; no domínio é a lista de ids
}
```

## Contrato dos UseCases

```ts
// createResource
interface CreateResourceInput {
  userId: string;
  title: string; // obrigatório, não-vazio (trim)
  type: ResourceType;
  url?: string | null;
  author?: string | null;
  description?: string | null;
  labelIds?: string[]; // default []
}
type CreateResourceOutput = Resource; // stage="backlog", status="ACTIVE"

// editResource
interface EditResourceInput {
  id: string;
  userId: string; // dono; rejeita editar recurso de outro user
  title?: string;
  type?: ResourceType;
  url?: string | null;
  author?: string | null;
  description?: string | null;
  stage?: ResourceStage;
  labelIds?: string[]; // se presente, SUBSTITUI o conjunto atual
}
type EditResourceOutput = Resource;
```

Dependência: ambos recebem `ResourceRepository` (interface — a 27 implementa o fake e o
Prisma). Para esta tarefa basta o **fake em memória** dentro de `test/`.

## Regras de negócio (o que os testes provam)

1. `createResource` define `stage="backlog"` e `status="ACTIVE"` **sempre**, ignorando
   qualquer tentativa de passar outro valor (não há campo no input para isso).
2. `title` vazio/só-espaços → erro de validação (no UseCase; o Zod da 28 reforça na borda).
3. `type` fora do enum → erro. (No UseCase isso é defensivo; a borda Zod é a guarda real.)
4. `editResource` num id inexistente → erro "not found".
5. `editResource` com `userId` ≠ dono do recurso → erro "not found" (não vaza existência).
6. `editResource` aplica **só** os campos presentes (patch parcial); ausentes não mudam.
7. `editResource` com `labelIds` presente **substitui** o conjunto; ausente mantém o atual.
8. `editResource` **não** altera `status`/`archivedAt` mesmo se o input tentar (não há campo).
9. `editResource` pode mover `stage` em qualquer direção (backlog↔in_progress↔done) — sem
   máquina de estados rígida no MVP; o dono manda. (Decisão: liberdade > burocracia.)

## Testes a escrever PRIMEIRO (Vitest, com fake repo)

`backend/test/usecase/resource/createResource.test.ts`:

- cria com defaults (stage=backlog, status=ACTIVE) e persiste no fake;
- `title` vazio rejeita;
- `labelIds` default vira `[]`;
- campos opcionais ausentes viram `null`.

`backend/test/usecase/resource/editResource.test.ts`:

- patch parcial só altera o presente;
- id inexistente → not found;
- user errado → not found;
- `labelIds` substitui conjunto; ausente mantém;
- `stage` move livre; `status` nunca muda via edit.

Ciclo: red → green → refactor. Implementação mínima só após os testes.

## Arquivos a tocar

- `backend/src/domain/resource/resource.ts` — tipos da entidade.
- `backend/src/usecase/resource/createResource.ts`
- `backend/src/usecase/resource/editResource.ts`
- `backend/src/usecase/resource/ResourceRepository.ts` — **interface** (impl fica na 27).
- `backend/test/usecase/resource/*.test.ts` — testes acima.
- `backend/test/fakes/FakeResourceRepository.ts` — fake em memória (reusado pela 27/28).
- **Não** tocar em `shared/` (Zod entra na 28), nem em Prisma/rotas.

## Fora de escopo

- Impl Prisma do repository (Tarefa 27).
- Schema Zod em `shared/` e rotas `/resources` (Tarefa 28).
- Arquivar/desarquivar Resource (UseCase de archive — junto da 28 ou tarefa própria).
- Listagem/filtro (`listResources` é a 28).
- Qualquer tela.

## Definição de pronto

- [x] Tipos do domínio de `Resource` criados. (`src/domain/resource.ts`)
- [x] Interface `ResourceRepository` definida (sem impl Prisma).
      (`src/usecases/ports/resource-repository.ts`)
- [x] `createResource` e `editResource` implementados, dependendo só da interface.
- [x] Testes de UseCase escritos **antes**, todos verdes, cobrindo as 9 regras. (13 testes)
- [x] Fake repo em memória disponível. (`src/usecases/_fakes/resource-repository-fake.ts`)
- [x] `createResource` força `backlog`/`ACTIVE`; `editResource` é patch parcial e **não**
      toca `status`/`archivedAt`.
- [x] Sem Prisma/Fastify/Zod/tela tocados.
- [x] Reportar feito vs definição e **parar** (não emendar a 27).
