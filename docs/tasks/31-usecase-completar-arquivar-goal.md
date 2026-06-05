# Tarefa 31 — UseCases `completeGoal` + `archiveGoal` (+ rotas)

> Fecha o **Bloco J — Goal**. Dois UseCases de transição de estado, com TDD (fake repo), e as
> rotas de ação. `completeGoal` é a conclusão manual (inclusive UMBRELLA, que "fecha na mão");
> `archiveGoal` é o soft delete padrão, **bloqueado se houver filhos ativos**.
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.** Em conflito com esta spec, vale aquele
> arquivo.

## Objetivo

Marcar um goal como concluído (`completedAt` manual) e arquivar um goal (soft delete), com a
regra de proteção da árvore de UMBRELLA. Tudo na camada de aplicação, sobre o `GoalRepository`
já pronto (Tarefas 29/30).

## Decisões já tomadas (do BACKLOG — não reabrir)

- **UMBRELLA fecha na mão** (`completedAt` manual) — `completeGoal` vale para UMBRELLA também.
- **Soft delete** em Goal: `status='ARCHIVED'` + `archivedAt`. (Event é log imutável; aqui é Goal.)
- Progresso/conclusão de filhos **não** fecha a UMBRELLA automaticamente (o dono fecha).

## Conceitos: "completar" ≠ "arquivar"

- **Completar** marca `completedAt` (o goal foi cumprido). O goal **continua `ACTIVE`** — não é
  lixo, é histórico vivo. (Decisão — ver abaixo: se o concluído deve sair da lista de ativos,
  ajustamos o filtro/lista.)
- **Arquivar** é tirar de vista (soft delete), independente de ter sido concluído ou não.

## Parte A — `completeGoal`

`src/usecases/complete-goal.ts`:

```ts
interface CompleteGoalInput {
  id: string;
  userId: string; // dono; senão GoalNotFoundError (não vaza)
  completedAt?: Date; // default: now
}
type CompleteGoalOutput = Goal;
```

Regras (testar):

1. id inexistente ou `userId` ≠ dono → `GoalNotFoundError`.
2. Define `completedAt` (input ou `new Date()`). **Vale para qualquer `type`, incl. UMBRELLA.**
3. Não altera `status`/`archivedAt`. Não cria `Event` (check é Bloco K; completar ≠ checar).
4. Goal arquivado → erro (`InvalidGoalError` "cannot complete archived goal"). (Decisão.)
5. Re-completar um já concluído: **atualiza** `completedAt` (idempotente, sem erro). (Decisão.)

## Parte B — `archiveGoal`

`src/usecases/archive-goal.ts`:

```ts
interface ArchiveGoalInput {
  id: string;
  userId: string; // dono; senão GoalNotFoundError
  archivedAt?: Date; // default: now
}
type ArchiveGoalOutput = Goal;
```

Regras (testar):

1. id inexistente ou `userId` ≠ dono → `GoalNotFoundError`.
2. **Bloqueio de filhos ativos**: se o goal tem **filhos com `status='ACTIVE'`**, lança
   `GoalHasActiveChildrenError(count)` — espelha o `LabelInUseError` (`reason:'activeChildren'`)
   já existente em `domain/errors.ts`. (Reusar o estilo daquele erro; criar
   `GoalHasActiveChildrenError` novo, ou generalizar — preferir erro novo e explícito.)
   - Detecção via `repo.find({ userId, parentId: id, status: 'ACTIVE' })`.
3. Sem filhos ativos → `status='ARCHIVED'`, `archivedAt` (input ou now). Idempotência: arquivar
   um já arquivado → no-op/atualiza `archivedAt` (sem erro). (Decisão.)
4. Arquivar um filho (folha) não exige nada além de ser dono.

> Só UMBRELLA tem filhos hoje (parent só aponta para UMBRELLA — Tarefa 29). A regra de bloqueio,
> porém, é genérica ("tem filho ativo"), não amarrada ao tipo — assim continua correta se a
> árvore evoluir.

## Parte C — Rotas

Acrescentar a `src/routes/goal-routes.ts` (já criado na Tarefa 30):

- **POST `/goals/:id/complete`** → params `{id}`, body `{ userId, completedAt? }`
  (`completeGoalSchema` em `shared/goal.ts`); `200: goalResponseSchema`;
  `GoalNotFoundError`→404, `InvalidGoalError`→400.
- **POST `/goals/:id/archive`** → params `{id}`, body `{ userId, archivedAt? }`
  (`archiveGoalSchema`); `200: goalResponseSchema`; `GoalNotFoundError`→404,
  `GoalHasActiveChildrenError`→409 (conflito — há filhos ativos; mesma semântica que o
  bloqueio de arquivar label).

Adicionar `completeGoalSchema` e `archiveGoalSchema` em `packages/shared/src/goal.ts`.

## Decisões que assumi (revisar antes de executar)

- **Goal concluído continua ACTIVE** (só ganha `completedAt`); não some da lista de ativos. Se
  você quiser que concluir tire da lista, ou ter um filtro "incluir concluídos", ajustamos o
  `listActiveGoals`/`GoalFilter`.
- **Bloqueio só por filhos ATIVOS** (filhos já arquivados não impedem). Alternativa: bloquear se
  houver qualquer filho — mais rígido; não recomendo.
- **`archiveGoal` não cascateia** (não arquiva filhos junto). O dono arquiva os filhos primeiro
  (a mensagem de erro diz quantos há). Cascata automática seria ação destrutiva implícita —
  evito.
- **Não há `unarchive`/`reopen` aqui** (desarquivar/reabrir é melhoria futura, está no HANDOFF §7).
- HTTP **409** para filhos ativos (e não 400). Se preferir 400, troco.

## Testes a escrever PRIMEIRO

- `src/usecases/__tests__/complete-goal.test.ts`: completa goal (qualquer tipo, incl. UMBRELLA);
  default now vs `completedAt` informado; dono errado/inexistente → not found; arquivado → erro;
  re-completar idempotente; `status` inalterado.
- `src/usecases/__tests__/archive-goal.test.ts`: arquiva folha; UMBRELLA com filho ativo →
  `GoalHasActiveChildrenError`; UMBRELLA cujos filhos estão todos arquivados → arquiva; dono
  errado → not found; idempotência.
- **Rotas** (integração, caminhos críticos): `POST /goals/:id/complete` → 200 com `completedAt`
  preenchido; `POST /goals/:id/archive` com filho ativo → 409; sem filhos → 200 `ARCHIVED`.

## Arquivos a tocar

- `src/domain/errors.ts` (`GoalHasActiveChildrenError`).
- `src/usecases/complete-goal.ts` · `src/usecases/archive-goal.ts` + testes unit.
- `packages/shared/src/goal.ts` (`completeGoalSchema`, `archiveGoalSchema`).
- `src/routes/goal-routes.ts` (2 rotas novas) + teste de rota.
- **Não** tocar: Event/check (Bloco K), telas, domínio do Goal (além do erro novo).

## Fora de escopo

- Check de objetivo / `Event` (Bloco K, Tarefas 32+).
- Desarquivar/reabrir goal. Cascata de arquivamento.
- Conclusão automática de UMBRELLA por progresso dos filhos.
- Qualquer tela (Bloco M).

## Definição de pronto

- [ ] `completeGoal` (manual, qualquer tipo incl. UMBRELLA; não mexe em status; idempotente;
      bloqueia se arquivado) com testes unit verdes.
- [ ] `archiveGoal` (soft delete; bloqueia com `GoalHasActiveChildrenError` se há filho ativo;
      idempotente) com testes unit verdes.
- [ ] `GoalHasActiveChildrenError` no padrão do `LabelInUseError`.
- [ ] Rotas `/goals/:id/complete` e `/goals/:id/archive` + schemas Zod; erros mapeados
      (404 / 400 / 409); teste de rota nos caminhos críticos.
- [ ] `unit` e `integration` verdes.
- [ ] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar feito vs definição e **parar**.
