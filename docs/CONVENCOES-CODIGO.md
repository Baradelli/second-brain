# Convenções de código — estrutura real do projeto

> Referência para quem escreve as specs em `docs/tasks/` e para o Claude Code.
> As regras de negócio/arquitetura estão no `CLAUDE.md`. **Aqui ficam os caminhos e nomes
> reais**, porque as specs às vezes usam paths/nomes genéricos que divergem do código.
> Quando a spec conflitar com este arquivo, **vale este arquivo** (ou pergunte ao dono).

## Resumo de uma linha

> Caminhos reais: `packages/backend/src/{domain,usecases,usecases/ports,usecases/_fakes,usecases/__tests__}`.
> Domínio e usecases **flat, kebab-case**, um arquivo por unidade. Erros em `domain/errors.ts`.
> Fakes com sufixo `-fake`. Testes em `__tests__/` ao lado do código; integração/contrato em
> `*.integration.test.ts`. Imports relativos com `.js`. `status` é união inline
> `'ACTIVE' | 'ARCHIVED'`, não um tipo `GeneralStatus`.

## 1. Raiz dos pacotes: `packages/backend/`, não `backend/`

Monorepo pnpm. Tudo do back vive em `packages/backend/`.

- ❌ Spec: `backend/src/domain/resource/resource.ts`
- ✅ Real: `packages/backend/src/domain/resource.ts`

## 2. Domínio: **flat**, um arquivo por entidade

- ❌ Spec: `domain/resource/resource.ts` (subpasta por entidade)
- ✅ Real: `domain/resource.ts`, `domain/capture.ts`, `domain/note.ts` — direto em `domain/`.
  Erros centralizados em `domain/errors.ts`.

## 3. UseCases: **flat + kebab-case** em `usecases/` (plural)

- ❌ Spec: `usecase/resource/createResource.ts` (singular, subpasta, camelCase)
- ✅ Real: `usecases/create-resource.ts`, `usecases/edit-resource.ts`.
  Pasta `usecases/` (plural), arquivos kebab-case, classe interna PascalCase (`CreateResource`).

## 4. Interfaces de Repository: `usecases/ports/`

- ❌ Spec: `usecase/resource/ResourceRepository.ts`
- ✅ Real: `usecases/ports/resource-repository.ts` (pasta `ports/`, kebab-case).

## 5. Testes: ao lado do código em `__tests__/`

- ❌ Spec: `backend/test/usecase/resource/createResource.test.ts`
- ✅ Real: `packages/backend/src/usecases/__tests__/create-resource.test.ts`.

## 6. Fakes: `usecases/_fakes/`, sufixo `-fake`

- ❌ Spec: `backend/test/fakes/FakeResourceRepository.ts` (prefixo `Fake`)
- ✅ Real: `usecases/_fakes/resource-repository-fake.ts`. Classe: `ResourceRepositoryFake`.

## 7. Testes de integração/contrato: nome + workspace

- ❌ Spec: `backend/test/contract/mvp2-schema.contract.test.ts`
- ✅ Real: terminar em `*.integration.test.ts` e ficar sob `src/`, para o
  `vitest.workspace.ts` capturar no project `integration`.
  Ex.: `src/repositories/__tests__/mvp2-schema.contract.integration.test.ts`.

O workspace separa:

- **`unit`** = `src/**/*.test.ts` (exclui integration) — sem banco. `pnpm test`.
- **`integration`** = `src/**/*.integration.test.ts` — Prisma/Postgres real. `pnpm test:integration`.

Helpers de banco de teste vivem em `src/repositories/__tests__/_db.ts`
(`prisma`, `setupTestUser`, `TEST_USER_ID`).

## 8. `GeneralStatus` não existe como tipo nomeado no domínio

- ❌ Spec: `export type GeneralStatus = 'ACTIVE' | 'ARCHIVED'; // reusar do MVP 1`
- ✅ Real: as entidades **inlinam** a união: `status: 'ACTIVE' | 'ARCHIVED'`
  (ver `note.ts`, `capture.ts`). É enum no Prisma (`GeneralStatus`), mas no domínio TS é
  união inline.

## 9. Imports relativos com extensão `.js` (ESM / NodeNext)

Regra implícita que as specs não citam: todos os imports relativos terminam em `.js`,
mesmo importando um `.ts`.

```ts
import { CreateResource } from './create-resource.js'; // arquivo é .ts
import type { Resource } from '../domain/resource.js';
```

Schemas Zod vêm de `@cerebro/shared` (nunca duplicar schema no back).

## 10. Validação no UseCase quando o Zod ainda não existe

Quando a fatia ainda não tem schema em `shared/` (o Zod entra numa tarefa de rota depois),
a validação fica no UseCase via erro de domínio dedicado (ex.: `InvalidResourceError` em
`domain/errors.ts`). Quando o schema de borda existir, ele reforça na rota — mas o UseCase
mantém a guarda defensiva.
