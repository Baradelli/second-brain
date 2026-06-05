# Tarefa 29 — Domínio `Goal` + UseCase `createGoal`

> Abre o **Bloco J — Goal**. TDD estrito: domínio mínimo da fatia + `createGoal`, testes
> antes da implementação, contra o **fake em memória**. Sem Prisma, sem Fastify, sem Zod em
> `shared/` (entram na 30). Ver `CLAUDE.md` (camadas + TDD) e `docs/BACKLOG.md` (decisões
> fechadas do MVP 2).
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.** Em conflito com esta spec, vale aquele
> arquivo.

## Objetivo

Permitir criar um `Goal` válido, com a regra que desambigua os quatro tipos
(HABIT | TARGET | PROJECT | UMBRELLA): cadência mutuamente exclusiva no HABIT, campos de
medida só em TARGET/PROJECT, e `parent` apenas para filho de UMBRELLA. Regra na camada de
aplicação, isolada de persistência/transporte.

## Decisões já tomadas (do BACKLOG — não reabrir)

- **UMBRELLA fecha na mão** (`completedAt` manual, Tarefa 31); **não recebe check direto**.
- **Cadência de HABIT**: `weekdays` (dias fixos) **ou** `period` + `timesPerPeriod`
  (Nx por período) — **mutuamente exclusivas**, validado na aplicação.
- **Progresso é calculado** (Tarefa 34), nunca guardado — aqui só criamos a definição do goal.

## Mini-domínio (só desta fatia)

`src/domain/goal.ts`:

```ts
export type GoalType = 'HABIT' | 'TARGET' | 'PROJECT' | 'UMBRELLA';
export type GoalPeriod = 'day' | 'week' | 'month';

export const GOAL_TYPES: readonly GoalType[] = [
  'HABIT',
  'TARGET',
  'PROJECT',
  'UMBRELLA',
];
export const GOAL_PERIODS: readonly GoalPeriod[] = ['day', 'week', 'month'];

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  type: GoalType;
  parentId: string | null;
  targetValue: number | null; // TARGET/PROJECT
  unit: string | null;
  period: GoalPeriod | null; // cadência "Nx por período" (HABIT)
  timesPerPeriod: number | null;
  weekdays: number[]; // 0=domingo..6=sábado (HABIT, dias fixos)
  startAt: Date | null;
  dueAt: Date | null;
  completedAt: Date | null; // UMBRELLA preenchido na mão (Tarefa 31)
  status: 'ACTIVE' | 'ARCHIVED';
  archivedAt: Date | null;
  createdAt: Date;
  labelIds: string[];
}
```

Erros novos em `src/domain/errors.ts`: `GoalNotFoundError(id)` e `InvalidGoalError(message)`.

## Repository (mínimo desta fatia)

`createGoal` precisa **salvar** e **consultar o pai** (para validar UMBRELLA). Logo, esta
tarefa cria a **interface** e o **fake** com o mínimo necessário — exatamente como a Tarefa 26
fez para Resource. A Tarefa 30 estende (find/update) + Prisma + contrato.

`src/usecases/ports/goal-repository.ts`:

```ts
export interface GoalFilter {
  userId: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  type?: GoalType;
  parentId?: string;
}

export interface GoalRepository {
  save(goal: Goal): Promise<Goal>;
  byId(id: string): Promise<Goal | null>;
  // find/update chegam na Tarefa 30 (a interface cresce junto com o fake e o Prisma).
}
```

`src/usecases/_fakes/goal-repository-fake.ts` — em memória (mesmo molde do
`resource-repository-fake.ts`), implementando `save`/`byId` agora.

## Contrato do UseCase

`src/usecases/create-goal.ts`:

```ts
export interface CreateGoalInput {
  userId: string;
  title: string;
  type: GoalType;
  description?: string | null;
  targetValue?: number | null;
  unit?: string | null;
  period?: GoalPeriod | null;
  timesPerPeriod?: number | null;
  weekdays?: number[];
  startAt?: Date | null;
  dueAt?: Date | null;
  parentId?: string | null;
  labelIds?: string[]; // default []
}
type CreateGoalOutput = Goal; // status='ACTIVE', completedAt=null, createdAt=now

// depende de GoalRepository (save + byId)
```

## Regras de negócio (o que os testes provam)

1. `type` fora do enum → `InvalidGoalError`.
2. `title` vazio/só-espaços → `InvalidGoalError` (trim aplicado quando válido).
3. **Cadência só faz sentido em HABIT**:
   - HABIT exige **exatamente uma** forma: `weekdays` não-vazio **XOR**
     (`period` definido **e** `timesPerPeriod` definido).
     - As duas formas presentes → erro.
     - Nenhuma presente → erro (HABIT precisa de cadência).
   - `weekdays` (quando usado): inteiros 0–6, sem repetição → senão erro.
   - `period` (quando usado): ∈ `day|week|month`; `timesPerPeriod` inteiro ≥ 1 → senão erro.
   - **Não-HABIT** (TARGET/PROJECT/UMBRELLA): `weekdays`/`period`/`timesPerPeriod` ausentes
     (ou `weekdays` vazio) → senão erro.
4. **Medida só em TARGET/PROJECT**:
   - TARGET/PROJECT: `targetValue`, se presente, deve ser > 0; `unit` opcional.
   - HABIT/UMBRELLA: `targetValue`/`unit` ausentes → senão erro.
5. **`parentId`** (filho de UMBRELLA):
   - Se presente: o pai deve **existir**, pertencer ao **mesmo `userId`** e ter
     `type='UMBRELLA'` → senão `InvalidGoalError`.
   - UMBRELLA **não** pode ter `parentId` (sem aninhar guarda-chuvas) → erro.
6. Defaults: `status='ACTIVE'`, `completedAt=null`, `archivedAt=null`, `weekdays` → `[]` quando
   ausente, `labelIds` → `[]`, opcionais ausentes → `null`. `createdAt = new Date()`.

## Decisões que assumi (revisar antes de executar)

- **HABIT exige cadência na criação** (não deixo HABIT sem `weekdays` nem `period`). Se você
  preferir permitir HABIT "rascunho" sem cadência, removo a parte "nenhuma presente → erro".
- **`targetValue` é opcional em TARGET e PROJECT** (não obrigo número na criação). Se um TARGET
  sempre precisa de alvo numérico, mudo para obrigatório só no TARGET.
- **UMBRELLA não aninha** (não pode ter pai). Se quiser árvore de mais de um nível, relaxo.
- **`startAt`/`dueAt` aceitos em qualquer tipo** sem validação de ordem (due ≥ start). Posso
  exigir a ordem se quiser.

## Testes a escrever PRIMEIRO (Vitest, fake repo)

`src/usecases/__tests__/create-goal.test.ts`:

- cria HABIT com `weekdays` (defaults corretos, persiste no fake);
- cria HABIT com `period`+`timesPerPeriod`;
- HABIT com as duas cadências → erro; HABIT sem cadência → erro;
- `weekdays` com valor fora de 0–6 ou repetido → erro;
- cria TARGET com `targetValue`+`unit`; `targetValue` ≤ 0 → erro;
- TARGET/PROJECT recebendo cadência → erro; HABIT/UMBRELLA recebendo `targetValue` → erro;
- cria UMBRELLA simples (sem cadência, sem medida);
- filho com `parentId` de UMBRELLA válido → ok; pai inexistente / de outro user / não-UMBRELLA
  → erro; UMBRELLA com `parentId` → erro;
- `type` inválido e `title` vazio → erro.

Ciclo red → green → refactor.

## Arquivos a tocar

- `src/domain/goal.ts` (novo) · `src/domain/errors.ts` (2 erros novos).
- `src/usecases/ports/goal-repository.ts` (novo) · `src/usecases/_fakes/goal-repository-fake.ts` (novo).
- `src/usecases/create-goal.ts` (novo) · `src/usecases/__tests__/create-goal.test.ts` (novo).
- **Não** tocar: `shared/`, Prisma, rotas, telas, outros UseCases.

## Fora de escopo

- `find`/`update` no repo, impl Prisma, contrato (Tarefa 30).
- Zod em `shared/`, rotas `/goals` (Tarefa 30).
- `editGoal`, `listActiveGoals` (Tarefa 30).
- `completeGoal`, `archiveGoal` (Tarefa 31). Check/Event (Bloco K).

## Definição de pronto

- [x] Domínio `Goal` + erros criados.
- [x] Interface `GoalRepository` (save/byId) + fake disponível.
- [x] `createGoal` implementado, dependendo só da interface.
- [x] Testes de UseCase escritos **antes**, todos verdes, cobrindo as 6 regras (com os casos
      de cadência exclusiva e parent de UMBRELLA). (20 testes)
- [x] Defaults corretos (`ACTIVE`, `completedAt=null`, `weekdays`/`labelIds` `[]`).
- [x] Sem Prisma/Fastify/Zod/tela tocados.
- [x] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar feito vs definição e **parar**.
