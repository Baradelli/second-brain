# Tarefa 65 — Seção "Revisões de hoje" na Agenda

> Frontend (mobile). Fecha o Bloco N: a Agenda passa a mostrar as revisões devidas hoje
> (`agenda.recallsDue`, Tarefa 62), em tom de convite. Confia em typecheck + build.

## Objetivo

Surfar na home as revisões devidas, com destaque para atrasadas, levando ao ritual de recall.

## Entregas

- Nova `<section>` em `AgendaPage` (depois de "Captures to review", antes do Quick capture):
  `SectionHeader` "Revisões de hoje". Se `agenda.recallsDue.length === 0` → `EmptyState`
  ("nada para revisar hoje" — tom positivo, anti-culpa). Senão, lista de cards (≤3 + "ver todas")
  com título do item e badge **atrasada** quando `overdue`; toque → `/study?review=<studyItemId>`
  (abre o `RecallSheet` da Tarefa 64).
- **i18n** `agenda.section.reviews`, `agenda.reviews.empty`, `agenda.reviews.overdue`,
  `agenda.reviews.viewAll` em pt/en.

## Definição de pronto

- [x] Seção "Revisões de hoje" na Agenda consumindo `recallsDue` (empty + lista + overdue + deep-link).
- [x] i18n pt/en. Typecheck e build do mobile passam.
- [x] `unit` + `integration` do backend seguem verdes (sem mudança de contrato).
- [x] Marcar BACKLOG. **Fim do Bloco N** → commit + análise.
