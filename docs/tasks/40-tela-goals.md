# Tarefa 40 — Tela de Goals + painel "X objetivos ativos"

> Continua o **Bloco M**. Tela para listar/criar objetivos e ver progresso; mais um painel
> resumido "X objetivos ativos" como porta de entrada (na Agenda). Backend pronto (Tarefas
> 29–35, incl. `GET /goals/:id/progress`). Mesmo método visual da Tarefa 39.

## Método visual

Igual à Tarefa 39: funcional + `@cerebro/ui` + CSS vars; **dono é QA do visual**; olhar
referência em `docs/design-refs/` se houver, senão herdar de `AgendaPage`; travar lógica e
rodar testes.

## Objetivo

- **Tela Goals** (`/goals`): listar objetivos **ativos** com seu tipo e **progresso**
  (`ProgressRing` de `@cerebro/ui`), criar objetivo, e marcar progresso (check) onde fizer
  sentido.
- **Painel "X objetivos ativos"**: bloco compacto na Agenda que mostra a contagem e leva para
  `/goals`.

## Camada de dados (adicionar em `endpoints.ts`)

Schemas de `@cerebro/shared` (`goalResponseSchema`, `createGoalSchema`, `goalType`,
`goalPeriod`, `goalProgressResponseSchema`, `eventResponseSchema`):

```ts
listActiveGoals(params?: { type?; parentId? }): Promise<GoalResponse[]>  // GET /goals?userId=…
createGoal(body): Promise<GoalResponse>                                  // POST /goals
getGoalProgress(id): Promise<GoalProgressResponse>                       // GET /goals/:id/progress
checkGoal(id, body?: { value?; occurredAt? }): Promise<EventResponse>    // POST /goals/:id/check
completeGoal(id): Promise<GoalResponse>                                   // POST /goals/:id/complete
// (skip/undo/archive entram quando a UI precisar; nesta tela, check + complete bastam)
```

## UI

- **Cabeçalho** padrão (`t('goals.title')`).
- **Agrupar por tipo** ou por UMBRELLA→filhos (ver decisão). Mínimo: lista de cards de goal.
- **Card de goal**: título, chip de tipo (HABIT/TARGET/PROJECT/UMBRELLA), `ProgressRing` com
  `ratio` de `getGoalProgress` (HABIT: período; TARGET/PROJECT: soma; UMBRELLA: filhos). Para
  HABIT/TARGET/PROJECT, ação de **check** (TARGET/PROJECT pedem `value` num input/bottom sheet;
  HABIT é 1 toque). UMBRELLA: botão **concluir** (não recebe check).
- **Criar**: `BottomSheet` + React Hook Form/Zod (`createGoalSchema`): título, tipo, e campos
  condicionais por tipo — HABIT mostra cadência (weekdays **ou** período+Nx, mutuamente
  exclusivos na UI); TARGET/PROJECT mostram targetValue/unit; permitir `parentId` (UMBRELLA) ao
  criar filho. **A validação fina é do backend** — a UI só evita o óbvio e mostra o erro 400.
- **Painel na Agenda**: card compacto "N objetivos ativos" (de `listActiveGoals().length`) que
  navega para `/goals`. Inserir sem quebrar o layout atual da Agenda.
- **Estados**: loading/erro/vazio (EmptyState com ícone alvo/`Target`).
- **i18n**: `goals.*`, `goal.type.*`, `goal.cadence.*` em pt/en.

## Navegação (decisão)

A tab bar já tem 5 slots cheios. Proponho: **`/goals` é rota secundária**, acessada pelo painel
"X objetivos ativos" na Agenda (e, opcionalmente, um link na Biblioteca). Não mexo na tab bar.

## Decisões que assumi (revisar)

- **`/goals` fora da tab bar** (entra via painel da Agenda). Se quiser Goals como aba fixa, a
  gente decide o que sai (ex.: Editor vira ação e Goals entra).
- **Check de TARGET/PROJECT pede `value`** num bottom sheet simples; HABIT é 1 toque.
- **UMBRELLA conclui na mão** (botão), coerente com o backend; não mostra check.
- **Cadência no form**: toggle "dias fixos" × "N vezes por período" (mutuamente exclusivo na
  UI). Erros de regra ainda vêm do backend.

## Testes (só fluxos que quebram em silêncio)

`src/__tests__/goals.test.tsx`:

- lista goals ativos a partir do mock; mostra progresso (ratio) por card;
- criar HABIT (weekdays) chama `createGoal` com corpo certo e atualiza a lista;
- check de um HABIT chama `checkGoal(id)` e re-busca progresso;
- estado vazio.
- **Agenda**: painel mostra a contagem de `listActiveGoals` e navega para `/goals`.

## Arquivos a tocar

- `packages/mobile/src/pages/GoalsPage.tsx` (novo) + rota em `router.tsx`.
- `packages/mobile/src/pages/AgendaPage.tsx` (painel "X objetivos ativos").
- `endpoints.ts` (+goals/progress/check/complete), `locales/*` (+chaves).
- `components/GoalForm.tsx` (se extraído), testes.
- **Não** tocar: backend, biblioteca (39), fechar-o-dia (41).

## Fora de escopo

- Skip/undo/arquivar pela UI (entram quando necessário; o fechar-o-dia 41 cobre skip).
- Edição completa de goal; árvore visual rica de UMBRELLA (mínimo: filhos listados).

## Definição de pronto

- [ ] `/goals` lista ativos com progresso (`ProgressRing`), cria goal (form Zod) e faz check
      (HABIT 1 toque; TARGET/PROJECT com value) / conclui UMBRELLA.
- [ ] Painel "X objetivos ativos" na Agenda navega para `/goals`, sem quebrar a Agenda.
- [ ] `@cerebro/ui` + CSS vars + i18n; testes dos fluxos verdes; suíte do mobile verde.
- [ ] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar e **parar**.
