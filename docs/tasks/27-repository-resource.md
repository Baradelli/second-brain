# Tarefa 27 — Repository de `Resource` (Prisma + teste de contrato)

> Borda de persistência da fatia de Resource. A **interface** `ResourceRepository` e o
> **fake em memória** já nasceram na Tarefa 26 (os UseCases dependem deles). Aqui entra a
> **implementação Prisma** real e **um teste de contrato** contra o Postgres, na política de
> "poucos testes de borda, mas existem" do `CLAUDE.md`.
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`** — os caminhos/nomes reais do projeto
> (monorepo `packages/backend/`, kebab-case, imports com `.js`, etc.). Em conflito com esta
> spec, vale aquele arquivo.

## Objetivo

Persistir `Resource` no Postgres via Prisma, traduzindo entre a entidade de domínio
(`src/domain/resource.ts`) e o registro Prisma, incluindo o vínculo N–N com `Label`. Ao
final, o mesmo contrato que o fake satisfaz nos testes de UseCase passa contra o banco real.

## Pré-requisitos já prontos (não recriar)

- `src/domain/resource.ts` — entidade `Resource` (Tarefa 26).
- `src/usecases/ports/resource-repository.ts` — interface `ResourceRepository` +
  `ResourceFilter` (`userId`, `stage?`, `status?`, `labelId?`) (Tarefa 26).
- `src/usecases/_fakes/resource-repository-fake.ts` — fake em memória (Tarefa 26).
- Tabela `Resource` + relação `ResourceLabels` no schema (Tarefa 25, migração aplicada).

Se a interface ou o fake precisarem de algum ajuste pequeno para o contrato bater (ex.: um
filtro faltando), pode ajustar **os três juntos** (interface + fake + Prisma) para manterem
o mesmo contrato. Não mudar a entidade de domínio.

## Contrato (a impl Prisma satisfaz a interface existente)

```ts
interface ResourceFilter {
  userId: string;
  stage?: 'backlog' | 'in_progress' | 'done';
  status?: 'ACTIVE' | 'ARCHIVED';
  labelId?: string; // resource cujo conjunto de labels inclui este id
}

interface ResourceRepository {
  save(resource: Resource): Promise<Resource>;
  byId(id: string): Promise<Resource | null>;
  find(filter: ResourceFilter): Promise<Resource[]>;
  update(id: string, patch: Partial<Resource>): Promise<Resource>;
}
```

## Regras de tradução (domínio ↔ Prisma)

Espelhar `PrismaNoteRepository` (`src/repositories/prisma-note-repository.ts`), com as
diferenças do Resource:

1. **`null` vs `undefined`**: a entidade `Resource` usa `string | null` (não `undefined`) em
   `url`/`author`/`description`/`archivedAt`. No `toDomain`, mapear `record.x ?? null`. (Difere
   do Note, que usa `undefined` — não copiar esse detalhe cegamente.)
2. **`labelIds`**: ler via `include: { labels: { select: { id: true } } }` e mapear para
   `record.labels.map(l => l.id)`. No `save`, conectar com
   `labels: { connect: labelIds.map(id => ({ id })) }` (só se houver labels). No `update`,
   quando `patch.labelIds` vier presente, usar `labels: { set: ... }` (substitui o conjunto);
   ausente, não tocar nas labels.
3. **`find`**: `where` com `userId` sempre; `stage`/`status` quando presentes; `labelId` vira
   `labels: { some: { id: labelId } }`.
4. **`update`**: separar `labelIds` do resto do patch (igual ao Note); aplicar só os campos
   presentes; se o id não existir, lançar erro (`throw new Error('Resource not found: ' + id)`
   — mesmo padrão defensivo do `PrismaNoteRepository`).
5. **`stage` e `type`** são `String` no banco; fazer o cast `as Resource['stage']` /
   `as Resource['type']` no `toDomain` (mesma técnica do Note com `type`/`scope`).

## Testes a escrever (teste de contrato, integração)

Arquivo: `src/repositories/__tests__/prisma-resource-repository.integration.test.ts`
(sufixo `.integration.test.ts` para cair no project `integration` do `vitest.workspace.ts`).

Usar os helpers de `src/repositories/__tests__/_db.ts` (`prisma`, `setupTestUser`,
`TEST_USER_ID`) no mesmo molde de `prisma-note-repository.integration.test.ts`:
`beforeAll(setupTestUser)`, `beforeEach(limpar)`, `afterAll(limpar + $disconnect)`. A limpeza
precisa apagar Resource (e Labels de teste) do `TEST_USER_ID`; lembrar que `Note` referencia
`Resource` por FK — se o teste não cria Notes, basta limpar Resource/Label.

Casos (poucos, mas cobrindo o contrato):

1. `save` + `byId` round-trip preserva todos os campos, incluindo `stage`/`status`/`labelIds`
   e os opcionais `null`.
2. `byId` de id desconhecido → `null`.
3. `save` com `labelIds` conecta as labels e `byId` devolve os ids.
4. `find` filtra por `userId` e por `stage`.
5. `find` filtra por `status`.
6. `find` filtra por `labelId` (só resources com aquela label).
7. `update` aplica patch parcial sem sobrescrever os demais campos.
8. `update` com `labelIds` **substitui** o conjunto; ausente mantém.
9. `update` de id inexistente → lança erro.

## Arquivos a tocar

- `src/repositories/prisma-resource-repository.ts` — impl Prisma (novo).
- `src/repositories/__tests__/prisma-resource-repository.integration.test.ts` — contrato (novo).
- (Se necessário p/ o contrato bater) `src/usecases/ports/resource-repository.ts` e
  `src/usecases/_fakes/resource-repository-fake.ts` — ajuste mínimo conjunto.
- **Não** tocar: `src/domain/resource.ts`, UseCases (`create-resource`/`edit-resource`),
  `shared/`, rotas, telas.

## Fora de escopo

- Schema Zod em `shared/` e rotas `/resources` (Tarefa 28).
- `listResources` como UseCase (Tarefa 28; aqui é só o `find` do repo).
- Arquivar/desarquivar Resource.
- Qualquer tela.

## Definição de pronto

- [x] `PrismaResourceRepository` implementa `ResourceRepository`, com `toDomain` mapeando
      `null` corretamente e o vínculo N–N de labels (`connect` no save, `set` no update,
      `some` no find).
- [x] Teste de contrato de integração escrito, cobrindo os 9 casos, todos verdes contra o
      Postgres real (`pnpm test:integration`). (9/9)
- [x] Suíte `unit` segue verde (nada de domínio/UseCase quebrado). (134/134)
- [x] Entidade de domínio **não** alterada; interface/fake não precisaram mudar (contrato já
      batia da Tarefa 26).
- [x] Sem Zod/rota/tela tocados.
- [x] Marcar esta tarefa (`BACKLOG.md` + esta "Definição de pronto"), reportar feito vs
      definição e **parar** (não emendar a 28).
