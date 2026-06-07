# Tarefa 48 — Tela: editar / arquivar / restaurar / excluir objetivos

> **Bloco F — Gerência de objetivos**, parte frontend (consome a 47). Na tela de Objetivos:
> tocar num objetivo abre **edição**; dentro dela, **arquivar**; e um botão **"ver arquivados"**
> revela a seção de arquivados com **restaurar** e **excluir** (confirmação; excluir só nos que
> nunca foram feitos). Decisões em `docs/MELHORIAS.md` (Bloco F).

## Entrega

- **API client** (`endpoints.ts`): `editGoal`, `archiveGoal`, `unarchiveGoal`, `deleteGoal`,
  `listArchivedGoals`.
- **`GoalForm`**: modo **edição** (`initial?: GoalResponse`) — campos preenchidos
  (título/cadência/weekdays/period/valor/unidade/labels), **tipo travado** (trocar tipo = recriar),
  e em edição o `labelIds` é sempre enviado (permite limpar).
- **`GoalsPage`**:
  - Card do objetivo: a área título/anel vira botão → abre **edição** (BottomSheet com `GoalForm`
    - botão **Arquivar**); o botão de check/concluir continua à direita.
  - Botão **"ver arquivados"** → seção com cada arquivado (título + **Restaurar**; **Excluir** só
    quando `deletable`). Excluir abre **confirmação** (microcopy anti-erro).
- **i18n** pt/en (`goals.edit.*`, `goals.archive*`, `goals.archived.*`, `goals.restore`,
  `goals.delete`, `goals.deleteConfirm.*`).

## Testes (`goals.test.tsx`)

- editar ao tocar no card: form preenchido, submit chama `editGoal(id, …)` **sem `type`**.
- arquivar pela edição chama `archiveGoal(id)`.
- "ver arquivados" lista e **restaurar** chama `unarchiveGoal(id)`.
- excluir elegível → confirmação → `deleteGoal(id)`.
- arquivado **não** elegível não mostra "excluir".

## Definição de pronto

- [x] Client com os 5 endpoints; `GoalForm` editável (tipo travado); `GoalsPage` com editar +
      arquivar + arquivados (restaurar/excluir com confirmação, excluir só nos `deletable`).
- [x] i18n pt/en; sem texto solto.
- [x] `goals.test.tsx` (9) verde; mobile **108** sem regressões; typecheck mobile/ui limpo; lint ok.
- [x] Marcar D... digo, **fechar o Bloco F** em `MELHORIAS.md` e reportar.

## Observação (navegação)

A tela de Objetivos (`/goals`) hoje só é acessível pelo painel "X objetivos ativos" da Home. Um
acesso mais direto (aba/atalho) ficou **fora desta tarefa** — depende de decisão de navegação com
o dono (anotado para conversar).
