# BACKLOG-MVP2.md — MVP 2 fatiado

> O MVP 2 introduz **Biblioteca + Objetivos**: as tabelas `Resource`, `Goal` e `Event`.
> Cada objetivo vira útil sozinho — check de objetivo = criar um `Event`; progresso é
> **sempre calculado** dos eventos, nunca guardado. O ritual "fechar o dia" é
> recapitulação, nunca auditoria (princípio anti-culpa). Detalhe de cada tarefa em
> `docs/tasks/`.

## Legenda de status

`[ ]` a fazer · `[~]` em revisão · `[x]` feito

## Decisões fechadas do MVP 2 (não reabrir sem decisão do dono)

- **Desfazer check = hard delete do `Event`** — única exceção documentada ao "Event é log
  imutável". `Event` não tem `status`/`archivedAt`.
- **"Deixa pra lá" grava nada.** Eventos possíveis: só `done` e `skip`. `skip` sempre tem
  `reason` (regra de aplicação).
- **Goal UMBRELLA fecha na mão** (`completedAt` manual); não recebe check direto.
- **Cadência de HABIT**: `weekdays` (dias fixos) **ou** `period` + `timesPerPeriod`
  (Nx por período) — mutuamente exclusivas, validado na aplicação.
- **FKs `Note → Goal` e `Note → Resource`** entram já na migração 25 (nullable).

## Sequência do MVP 2

> Mesma lógica do MVP 1: domínio primeiro (testável com fake repo), depois persistência,
> depois rota, depois tela. TDD estrito no domínio/UseCases; bordas (repo/rota) só no
> essencial; UI só fluxos que quebram em silêncio. A 25 é exceção (migração pura, sem TDD).

### Bloco I — Fundação (schema + Resource)

- [x] **25** — Migração Prisma: `Resource`, `Goal`, `Event` + FKs opcionais em `Note` + relações de `Label`/`User`. (Migração pura, sem TDD.) → `tasks/25-migracao-mvp2.md`
- [x] **26** — Domínio + UseCase `createResource` / `editResource` (valida `type`/`stage`, vincula labels). → `tasks/26-usecase-resource.md`
- [x] **27** — Repository de Resource (interface + fake + Prisma + contrato). → `tasks/27-repository-resource.md`
- [x] **28** — UseCase `listResources` (filtro por stage/label) + Schema Zod em `shared/` + rotas `/resources`. → `tasks/28-rota-resources.md`

### Bloco J — Goal

- [x] **29** — Domínio + UseCase `createGoal` (valida `type`; cadência exclusiva; `parent` só para filho de UMBRELLA). → `tasks/29-usecase-criar-goal.md`
- [x] **30** — Repository de Goal (interface + fake + Prisma + contrato) + Schema Zod + rotas `/goals` (criar, listar ativos, editar). → `tasks/30-repository-rota-goal.md`
- [x] **31** — UseCase `completeGoal` (manual, inclusive UMBRELLA) + `archiveGoal` (soft delete + bloqueio se tiver filhos ativos). → `tasks/31-usecase-completar-arquivar-goal.md`

### Bloco K — Event + progresso

- [x] **32** — Domínio + UseCase `checkGoal` (cria `Event done`; `value` para TARGET/PROJECT; **rejeita UMBRELLA**) + `undoCheck` (**hard delete** — a exceção). → `tasks/32-usecase-check-undo.md`
- [x] **33** — UseCase `skipGoal` (cria `Event skip` com `reason` **obrigatório**). → `tasks/33-usecase-skip.md`
- [x] **34** — UseCase `computeGoalProgress` (HABIT conta eventos no período; TARGET/PROJECT somam `value`; UMBRELLA agrega filhos) — puro, só leitura, **TDD pesado aqui**. → `tasks/34-usecase-progresso.md`
- [x] **35** — Repository de Event (interface + fake + Prisma + contrato) + rotas de check/skip/undo. → `tasks/35-repository-rota-event.md`

### Bloco L — Fechar o dia + integrações

- [x] **36** — UseCase `buildDayClosing` (pendentes de hoje: `weekdays` fixos + convites de período aberto) + rota `GET /day-closing?day=today`. → `tasks/36-usecase-fechar-o-dia.md`
- [x] **37** — Estender `promoteCapture` para destino `resource` e `goal` (hoje só `note`). → `tasks/37-promover-captura-resource-goal.md`
- [x] **38** — Estender `buildTodayAgenda` com os objetivos do dia (sem quebrar o contrato atual da agenda). → `tasks/38-agenda-com-objetivos.md`

### Bloco M — Frontend (só depois do domínio pronto)

- [x] **39** — Tela Biblioteca: listar/criar `Resource`, filtros por stage/label (design system da 19b). → `tasks/39-tela-biblioteca.md`
- [x] **40** — Tela de Goals + painel "X objetivos ativos". → `tasks/40-tela-goals.md`
- [x] **41** — Tela "Fechar o dia" (**fiz** / **não fiz porque…** / **deixa pra lá**) — o tom anti-culpa mora aqui. → `tasks/41-tela-fechar-o-dia.md`
- [x] **42** — Promoção na tela de revisão de captura (note | resource | goal). → `tasks/42-tela-promover-captura.md`

## Definição de "MVP 2 pronto"

Eu consigo gerenciar minha **biblioteca** (livros/cursos/vídeos com labels e estágio) e meus
**objetivos** (hábito, meta, projeto, guarda-chuva). Marco um objetivo como feito (vira um
`Event`) e vejo o **progresso calculado** dos eventos. No fim do dia, "fecho o dia" num ritmo
de recapitulação — cada pendente resolve como fiz / não fiz porque… / deixa pra lá, sem culpa.
Promovo uma captura direto para recurso ou objetivo. Tudo com o domínio coberto por testes.
Sem IA, sem métricas/streaks (isso é MVP 3), sem busca semântica (MVP 4).

---

> As specs em `docs/tasks/` são detalhadas **uma de cada vez**, conforme a tarefa se aproxima
> (para não gerar 18 specs que envelhecem antes do uso). A da Tarefa 25 já está criada.
> Quando chegar perto de uma tarefa ainda não detalhada, peça para detalhá-la.
