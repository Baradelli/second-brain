# Tarefa 64 — Tela: revisão do dia (recall) com A/B/C

> Frontend (mobile). O ritual de recuperação ativa: "tente lembrar **antes** de reler", reinstale o
> contexto, marque A/B/C. Confia em typecheck + build (política de UI do projeto).

## Objetivo

Revisar um `StudyItem` registrando um `Recall` (Práticas 3/7/8): prompts de recuperação +
contexto episódico + marcação de confiança A/B/C, que avança o agendamento.

## Entregas

- **`RecallSheet`** (componente, usado pela `StudyItemsPage`): um `BottomSheet` que, dado um item:
  1. Mostra a moldura **"Tente lembrar antes de reler"** + as `questions` do item (se houver) +
     **prompts fixos de contexto episódico** (i18n): "Onde no argumento apareceu? Contra quem
     argumentava? Qual era a transição?".
  2. Link **"escrever/ver fichamento"** → editor (`STUDY_NOTE`).
  3. Três botões **A / B / C** (A=sei explicar, B=reconheço, C=não sei) → `logRecall(id, { confidence })`
     → fecha e recarrega a lista (schedule avança).
- A `StudyItemsPage` abre o `RecallSheet` ao tocar num item (ou num botão "revisar"); também via
  query `?review=<studyItemId>` (deep-link vindo da Agenda — Tarefa 65).
- **i18n** `review.*` (A/B/C, prompts de contexto, título) em pt/en.

## Definição de pronto

- [x] `RecallSheet` com prompts + contexto episódico + A/B/C chamando `logRecall`.
- [x] Integrado à `StudyItemsPage` (toque + deep-link `?review=`).
- [x] i18n pt/en. Typecheck e build do mobile passam.
- [x] Marcar BACKLOG.
