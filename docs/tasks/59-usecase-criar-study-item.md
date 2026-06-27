# Tarefa 59 — Domínio + UseCase `createStudyItem` (+ editar/arquivar)

> Segunda tarefa do **Bloco N**. **TDD estrito**: domínio mínimo da fatia + os UseCases, com testes
> escritos **antes** da implementação, contra o **Repository fake em memória**. Sem Prisma, sem
> Fastify, sem Zod em `shared/` aqui (chegam na 61). Ver `CLAUDE.md` (camadas + TDD outside-in) e
> `docs/LEITURA-RETENTIVA.md` (§4).
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.** Em conflito com esta spec, vale aquele arquivo.

## Objetivo

Permitir **criar**, **editar** e **arquivar** um `StudyItem` (uma unidade de estudo a reter, ligada
a um `Resource`) com a regra de negócio isolada de persistência e transporte. A rota e a impl Prisma
chegam na Tarefa 61; o log de revisão (`Recall`) e a escada de agendamento são a Tarefa 60.

## Decisões já tomadas (não reabrir)

- **`createStudyItem`**: `status` nasce sempre `ACTIVE`. `createdAt` = `now` (é o dia do fichamento,
  base da escada). `resourceId`, `reference`, `questions`, `fichamentoNoteId` são **opcionais**.
- **`editStudyItem`**: edita `title`, `reference`, `questions`, `resourceId`, `fichamentoNoteId` e
  `labelIds`. **NÃO** mexe em `status`/`archivedAt` (arquivar é UseCase separado — simetria
  editar ≠ arquivar do MVP 1/2).
- **`archiveStudyItem`**: soft delete (`status='ARCHIVED'` + `archivedAt=now`). **Não** apaga
  `Recall` (log imutável permanece).
- **`CONSOLIDATED` não é setado aqui** — é resultado **calculado** da escada (Tarefa 60); esta
  tarefa só lida com ACTIVE/ARCHIVED. (Persistir CONSOLIDATED, se quisermos materializar, é decisão
  da 60/61; o default do domínio é calcular.)
- **`questions`** tem forma `{ before: string[]; during: string[]; after: string[] }` (todas
  opcionais; default arrays vazios).

## Mini-domínio (só desta fatia)

Entidade simples (DDD-lite, sem value objects). Tipos em `backend/src/domain/study-item.ts`:

```ts
export type StudyItemStatus = 'ACTIVE' | 'ARCHIVED' | 'CONSOLIDATED';

export interface StudyQuestions {
  before: string[];
  during: string[];
  after: string[];
}

export interface StudyItem {
  id: string;
  userId: string;
  resourceId: string | null;
  title: string;
  reference: string | null;
  questions: StudyQuestions | null;
  fichamentoNoteId: string | null;
  status: StudyItemStatus;
  archivedAt: Date | null;
  createdAt: Date;
  labelIds: string[]; // vínculo resolvido no repo; no domínio é a lista de ids
}
```

Erros novos em `src/domain/errors.ts`: `StudyItemNotFoundError(id)`. (Reusar o padrão dos erros
existentes — ex.: `ResourceNotFoundError`/`GoalNotFoundError` — não vazar existência para outro user.)

## Repository (mínimo desta fatia)

`src/usecases/ports/study-item-repository.ts` — declarar a interface; implementar agora só o
necessário (a 60 acrescenta o que `Recall` precisar; a 61 faz o Prisma + contrato + `find`/filtros):

```ts
export interface StudyItemRepository {
  save(item: StudyItem): Promise<StudyItem>; // create + update (upsert por id)
  byId(id: string): Promise<StudyItem | null>;
  // find(filter): Promise<StudyItem[]>;          // chega na 61 (listagem/filtros)
}
```

`src/usecases/_fakes/study-item-repository-fake.ts` — implementa `save`/`byId` agora.

## Contrato dos UseCases

`src/usecases/create-study-item.ts`:

```ts
export interface CreateStudyItemInput {
  userId: string;
  title: string; // obrigatório, não-vazio (trim)
  resourceId?: string | null;
  reference?: string | null;
  questions?: Partial<StudyQuestions> | null;
  fichamentoNoteId?: string | null;
  labelIds?: string[]; // default []
}
type CreateStudyItemOutput = StudyItem; // status="ACTIVE", createdAt=now
```

`src/usecases/edit-study-item.ts`:

```ts
export interface EditStudyItemInput {
  id: string;
  userId: string; // dono; senão StudyItemNotFoundError (não vaza)
  title?: string;
  resourceId?: string | null;
  reference?: string | null;
  questions?: Partial<StudyQuestions> | null;
  fichamentoNoteId?: string | null;
  labelIds?: string[]; // se presente, SUBSTITUI o conjunto atual
}
type EditStudyItemOutput = StudyItem;
```

`src/usecases/archive-study-item.ts`:

```ts
export interface ArchiveStudyItemInput {
  id: string;
  userId: string; // dono; senão StudyItemNotFoundError
}
type ArchiveStudyItemOutput = StudyItem; // status="ARCHIVED", archivedAt=now
```

Dependência: os três recebem `StudyItemRepository` (interface). Para esta tarefa basta o **fake em
memória**.

## Regras de negócio (o que os testes provam)

`createStudyItem`:

1. `title` vazio/só-espaços → erro de validação (no UseCase; o Zod da 61 reforça na borda).
2. `status` nasce `"ACTIVE"` e `createdAt=now` **sempre** (não há campo de input para mudar).
3. Opcionais ausentes viram `null`; `labelIds` ausente vira `[]`.
4. `questions` parcial é normalizado para `{ before: [], during: [], after: [] }` preenchendo o que
   faltar (ou `null` se o input não trouxe `questions`). (Decisão — revisar abaixo.)
5. Persiste no fake e devolve a entidade.

`editStudyItem`:

6. id inexistente → `StudyItemNotFoundError`.
7. `userId` ≠ dono → `StudyItemNotFoundError` (não vaza existência).
8. Aplica **só** os campos presentes (patch parcial); ausentes não mudam.
9. `labelIds` presente **substitui** o conjunto; ausente mantém o atual.
10. **Não** altera `status`/`archivedAt`/`createdAt` mesmo que o input tente (não há campo).

`archiveStudyItem`:

11. id inexistente / outro user → `StudyItemNotFoundError`.
12. Seta `status="ARCHIVED"` + `archivedAt=now`; idempotente (arquivar já arquivado mantém).
13. **Não** apaga `Recall` nem mexe no histórico.

## Decisões que assumi (revisar antes de executar)

- **`questions` normalizado para os 3 arrays** (regra 4): simplifica a UI. Se preferir guardar
  exatamente o que veio (sem preencher chaves faltantes), relaxo.
- **Editar pode trocar `resourceId`/`fichamentoNoteId` livremente** (inclusive para `null`): o dono
  manda; sem máquina de estados. Se quiser travar a troca depois de criado, restrinjo.
- **Não valido existência de `resourceId`/`fichamentoNoteId`/`labelIds`** no UseCase (são ids; a
  integridade é do repo/Prisma na 61). Mantém o domínio puro, como em `createResource`.

## Testes a escrever PRIMEIRO (Vitest, com fake repo)

`src/usecases/__tests__/create-study-item.test.ts`:

- cria com defaults (status=ACTIVE, createdAt setado) e persiste no fake;
- `title` vazio rejeita;
- opcionais ausentes viram `null`; `labelIds` default vira `[]`;
- `questions` parcial normaliza os 3 arrays; ausência vira `null`.

`src/usecases/__tests__/edit-study-item.test.ts`:

- patch parcial só altera o presente;
- id inexistente → not found; user errado → not found;
- `labelIds` substitui conjunto; ausente mantém;
- `status`/`archivedAt`/`createdAt` nunca mudam via edit.

`src/usecases/__tests__/archive-study-item.test.ts`:

- arquiva (status=ARCHIVED + archivedAt); idempotente; id/user errado → not found.

Ciclo: red → green → refactor. Implementação mínima só após os testes.

## Arquivos a tocar

- `src/domain/study-item.ts` (novo) · `src/domain/errors.ts` (`StudyItemNotFoundError`).
- `src/usecases/ports/study-item-repository.ts` (novo) · `_fakes/study-item-repository-fake.ts` (novo).
- `src/usecases/create-study-item.ts` · `edit-study-item.ts` · `archive-study-item.ts` + testes acima.
- **Não** tocar: `shared/` (Zod entra na 61), Prisma, rotas, telas, `Recall`/escada (Tarefa 60).

## Fora de escopo

- `Recall`, `logRecall`/`undoRecall` e a escada de agendamento (Tarefa 60).
- Impl Prisma do repository, contrato, `find`/listagem, Zod em `shared/`, rotas (Tarefa 61).
- Agenda (62), telas (63–65), publicação (Bloco O), IA (Bloco P).

## Definição de pronto

- [x] Tipos do domínio de `StudyItem` criados (`src/domain/study-item.ts`), com helper
      `normalizeQuestions` compartilhado por create/edit.
- [x] Interface `StudyItemRepository` (save/byId/**update**) + fake em memória. (`update` incluído
      por ser necessário em edit/archive — `find`/filtros ficam para a 61.)
- [x] `createStudyItem`, `editStudyItem`, `archiveStudyItem` implementados, dependendo só da interface.
- [x] `createStudyItem` força `ACTIVE`/`createdAt`; `editStudyItem` é patch parcial e **não** toca
      `status`/`archivedAt`/`createdAt`; `archiveStudyItem` faz soft delete (idempotente) sem mexer no histórico.
- [x] Testes de UseCase escritos **antes**, todos verdes, cobrindo as regras (create: 5 · edit: 8 ·
      archive: 3 = 16).
- [x] Sem Prisma/Fastify/Zod/tela tocados.
- [x] Reportar feito vs definição e **parar** (não emendar a Tarefa 60).
