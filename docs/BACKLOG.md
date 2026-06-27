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

---

# Leitura Retentiva (pós-MVP 2)

> Origem: `docs/10-Praticas-de-Leitura-Retentiva.pdf` + pedido do dono. **Design e racional em
> `docs/LEITURA-RETENTIVA.md`** (leia antes). Três blocos: **N** (motor de revisão espaçada +
> recuperação ativa), **O** (Ensinar para Reter / publicação) e **P** (Agente IA prompt-first).
> Mesma ordem do projeto: migração → domínio/UseCases (TDD) → repo/rota → agenda → telas. As specs
> de fundação do Bloco N (58/59/60) já estão detalhadas; o resto detalha-se ao se aproximar.

## Decisões fechadas (não reabrir sem o dono)

- **Espaçamento por intervalos fixos:** 2 dias → 1 semana → 1 mês, igual para todos os tópicos.
- **A/B/C é registro metacognitivo** (Prática 7), **não** dirige o intervalo — só prioriza/destaca
  o que se sabe menos.
- **Naming (código em inglês):** `StudyItem` (durável) + `Recall` (log imutável). Evita colidir com
  o "review" do ritual de capturas. UI/conteúdo seguem dizendo "revisão".
- **`Recall` é log imutável** (sem `status`/`archivedAt`); desfazer = **hard delete** (mesma exceção
  do `Event`). **`nextRecallAt`/consolidado são calculados**, nunca guardados.
- **IA = só design neste round** (Bloco P): prompt-first, **modo cheap (copiar prompt) primeiro**,
  Anthropic SDK depois — mesmos templates. Respeita o **§9 do plano** (espelho, não piloto).

### Bloco N — Motor de Leitura Retentiva

- [x] **58** — Migração Prisma: `StudyItem` + `Recall` + `enum StudyItemStatus` + FKs nullable
      (`resourceId`, `fichamentoNoteId`, `studyItemId`, `userId`) + m2m `StudyItemLabels`. Migração
      pura, sem TDD. → `tasks/58-migracao-leitura-retentiva.md`
      (migração `20260627151117_leitura_retentiva_studyitem_recall`; smoke de contrato com 2 testes)
- [x] **59** — Domínio + UseCase `createStudyItem` (+ `editStudyItem`/`archiveStudyItem`): valida
      título, vincula `Resource`/labels/`questions`/`fichamentoNoteId`. TDD estrito (fake repo). →
      `tasks/59-usecase-criar-study-item.md` (16 testes de UseCase verdes)
- [x] **60** — Domínio `recall-schedule` (escada fixa, puro — **TDD pesado**) + UseCases `logRecall`
      (cria `Recall` com `confidence` A/B/C) e `undoRecall` (hard delete). →
      `tasks/60-usecase-recall-agendamento.md` (20 testes verdes: 10 escada · 7 log · 3 undo)
- [x] **61** — Repository (`StudyItem` + `Recall`): Prisma + contrato + Schemas Zod em `shared/` +
      rotas `/study-items` (criar/listar/editar/arquivar) e `/study-items/:id/recalls` (logar/desfazer).
      → `tasks/61-repo-rota-study-item.md` (schedule embutido no response; contratos + rotas verdes)
- [x] **62** — Estender `buildTodayAgenda` com `recallsDue` (revisões devidas hoje) — campo novo
      retrocompatível, reusando o helper de agendamento da 60. → `tasks/62-agenda-recalls-due.md`
      (`SelectDueRecalls` + agenda/contrato; frontend `todayAgendaSchema` atualizado)
- [x] **63** — Tela: criar `StudyItem` + **fichamento de memória** a partir de um `Resource`
      (`StudyItemsPage` + `StudyItemForm` + rota `/study` + nav + entry point no ResourceDetailPage).
      → `tasks/63-tela-study-item-fichamento.md`
- [x] **64** — Tela: **revisão do dia** (recall) — `RecallSheet` com prompts de "tente lembrar" +
      contexto episódico (Prática 8) + A/B/C → `logRecall`; deep-link `?review=`.
      → `tasks/64-tela-revisao-recall.md`
- [x] **65** — Seção **"Revisões de hoje"** na Agenda (`recallsDue`, empty/lista/overdue/deep-link).
      → `tasks/65-agenda-revisoes-de-hoje.md`
- [x] **65b** — Fichamento de memória em **duas fases** (escrever sem olhar → comparar) +
      auto-vínculo `fichamentoNoteId`. → `tasks/65b-fichamento-duas-fases.md`

### Bloco O — Ensinar para Reter (publicação)

- [ ] **66** — Migração + domínio `Publication` (`sourceType`/`sourceId`, `format`, `stage`
      idea/draft/published, `status` soft-delete, `noteId?`). → `tasks/66-migracao-dominio-publication.md`
- [ ] **67** — UseCases create/edit/archive/list + repo Prisma + contrato + Zod + rotas
      `/publications` (edit move `stage`; published seta `publishedAt`). → `tasks/67-usecases-repo-rota-publication.md`
- [ ] **68** — **Gatilho de publicação** a partir de fichamento/nota/recap (`PublishTrigger` cria
      `Publication` em `idea`, em tom de convite). → `tasks/68-gatilho-publicacao.md`
- [ ] **69** — Tela de **pipeline de publicações** (idea/draft/published) + editar rascunho no editor
      (auto-vínculo de `noteId`). → `tasks/69-tela-pipeline-publicacoes.md`

### Bloco P — Agente IA (prompt-first)

- [ ] **70** — `PromptBuilder` em `shared/` (templates + interpolação, **puro, TDD**; 4 skills, pt/en,
      moldura §9). → `tasks/70-promptbuilder-shared.md`
- [ ] **71** — Modo **cheap**: `PromptSheet` "Copiar prompt" nas 4 superfícies (frontend; sem chave,
      sem custo). → `tasks/71-modo-cheap-copiar-prompt.md`
- [ ] **72** — **Colar resultado** → prévia editável → confirmação vira `questions`/`Note`/rascunho;
      `Settings.aiMode` (cheap/connected, default cheap). → `tasks/72-colar-resultado-candidato.md`
- [ ] **73** — _(futuro)_ Modo **conectado**: porta `AiRunner` + `AnthropicRunner` + `POST /ai/run`,
      reusando os templates; chave só no servidor. → `tasks/73-modo-conectado-anthropic.md`

## Definição de "Leitura Retentiva pronta" (Blocos N+O)

Eu leio um capítulo, formulo perguntas antes, **escrevo de memória sem olhar** e comparo. Aquilo
vira um `StudyItem` que o app me devolve para **revisar em 2 dias, 1 semana e 1 mês**, sempre
começando por tentar lembrar; marco **A/B/C** e o app destaca o que sei menos. Quando algo vale,
**viro num rascunho de post/aula** com um clique. Tudo com domínio coberto por testes, sem IA
obrigatória. O agente (Bloco P) entra como assistente opcional, começando pelo **modo cheap**.
