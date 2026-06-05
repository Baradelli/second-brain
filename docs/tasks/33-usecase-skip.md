# Tarefa 33 — UseCase `skipGoal` (Event `skip` com `reason` obrigatório)

> Continua o **Bloco K**. TDD estrito. Registra o "não fiz porque…" do ritual de fechar o dia:
> um `Event` `skip` que **sempre** carrega um `reason`. `skip` é informação (alimenta o agente
> no futuro), nunca fracasso — princípio anti-culpa. Ver `docs/BACKLOG.md`.
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.** Em conflito com esta spec, vale aquele
> arquivo.

## Objetivo

Registrar que um objetivo pendente foi conscientemente pulado, com motivo. Reaproveita o
domínio `Event` e o `EventRepository` (save) da Tarefa 32.

## Decisões já tomadas (do BACKLOG — não reabrir)

- **Eventos possíveis: só `done` e `skip`.** "Deixa pra lá" **não grava nada** (não há Event;
  é só a ausência de registro — tratado na tela/fechar-o-dia, Tarefas 36/41).
- **`skip` sempre tem `reason`** (regra de aplicação, não constraint de banco).

## Contrato do UseCase

`src/usecases/skip-goal.ts`:

```ts
export interface SkipGoalInput {
  goalId: string;
  userId: string; // dono; senão GoalNotFoundError (não vaza)
  reason: string; // OBRIGATÓRIO, não-vazio (trim)
  occurredAt?: Date; // default: now
}
type SkipGoalOutput = Event; // type='skip', value=null

// depende de GoalRepository (byId) + EventRepository (save)
```

## Regras de negócio (o que os testes provam)

1. Goal inexistente ou de outro user → `GoalNotFoundError` (não vaza).
2. `reason` vazio/só-espaços → `InvalidCheckError` ('skip requires a reason'). Trim aplicado.
3. **UMBRELLA → `InvalidCheckError`** (não é checável nem "pulável" direto; coerência com o
   check da Tarefa 32). (Decisão.)
4. Goal arquivado → `InvalidCheckError` ('cannot skip an archived goal'). (Decisão, coerente
   com o check.)
5. Cria `Event` `skip` com `value=null`, `reason` (trim), `occurredAt = input.occurredAt ?? now`.

## Decisões que assumi (revisar antes de executar)

- **UMBRELLA não é "pulável"** (regra 3), por simetria com o check. Se UMBRELLA puder receber
  skip, removo.
- **`skip` é permitido a qualquer momento** (não exijo que o goal esteja "pendente hoje"). A
  noção de pendência é da Tarefa 36 (fechar o dia); aqui só registramos o evento.
- Reuso `InvalidCheckError` (criado na 32) para os erros de skip. Se preferir um
  `InvalidSkipError` separado, crio.

## Testes a escrever PRIMEIRO (Vitest, fakes)

`src/usecases/__tests__/skip-goal.test.ts`:

- cria `skip` com `reason` e `value=null` (default e `occurredAt` explícito);
- `reason` vazio/espaços → erro;
- UMBRELLA → erro; goal arquivado → erro;
- goal de outro user/inexistente → `GoalNotFoundError`.

## Arquivos a tocar

- `src/usecases/skip-goal.ts` + `src/usecases/__tests__/skip-goal.test.ts`.
- (Sem domínio/erro novo se a 32 já criou `Event`/`InvalidCheckError`.)
- **Não** tocar: `shared/`, Prisma, rotas, telas.

## Fora de escopo

- "Deixa pra lá" (não grava nada — UI/fechar-o-dia, 36/41).
- Progresso (34), Prisma/rotas de Event (35).

## Definição de pronto

- [x] `skipGoal` implementado, dependendo só das interfaces (Goal + Event repos).
- [x] `reason` obrigatório; rejeita UMBRELLA e goal arquivado; not-found para owner errado.
- [x] Testes de UseCase escritos **antes**, todos verdes (6 testes).
- [x] Sem Prisma/Fastify/Zod/tela tocados.
- [x] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar feito vs definição e **parar**.
