# Tarefa 71 — Modo cheap: "Copiar prompt" nas superfícies (Bloco P)

> Frontend (mobile). O modo **cheap** (custo zero, sem chave): o app **monta o prompt** com o
> `PromptBuilder` (Tarefa 70) e o usuário **copia** para colar no seu ChatGPT/Claude. A IA **não
> toca em dado** — aderência máxima ao §9. Confia em typecheck + build.

## Objetivo

Em cada superfície relevante, um botão "Copiar prompt" que abre uma folha com o prompt montado
(system + user) e um **copiar para a área de transferência**.

## Entregas

- **Componente `PromptSheet`** (`components/PromptSheet.tsx`): recebe `skill` + `context`; chama
  `buildPrompt` (de `@cerebro/shared`) com o `locale` atual do i18n; mostra o `user` (e o `system`
  recolhível) em bloco monoespaçado com botão **Copiar** (`navigator.clipboard.writeText`,
  com fallback). Microcopy: "cole no seu ChatGPT/Claude e traga o resultado de volta".
- **Superfícies (gatilhos):**
  - `StudyItemsPage`/criar item → `study.questions` (gera perguntas antes/durante/depois).
  - `RecallSheet` (com fichamento) → `study.fichamento_feedback` (precisa do texto do fichamento;
    buscar via `getNoteById(fichamentoNoteId)` → `plainText`).
  - `RecallSheet` → `study.quiz` (quiz de recuperação).
  - `PublicationsPage`/rascunho (Bloco O) → `publish.draft` (formato + texto-fonte).
- **i18n** `ai.*` (copiar, copiado, dica de colar, nomes das habilidades) em pt/en.
- **Sem backend, sem chave, sem custo.**

## Arquivos

- `components/PromptSheet.tsx` (novo).
- `pages/StudyItemsPage.tsx`, `pages/PublicationsPage.tsx` — instâncias do `PromptSheet`.
- `locales/pt.json` + `en.json` — `ai.*`.

## Fora de escopo

- Trazer a resposta de volta automaticamente (cheap é copiar/colar manual). Persistir resultado
  (Tarefa 72). Execução conectada / Anthropic (Tarefa 73).

## Definição de pronto

- [x] `PromptSheet` montando prompt via `buildPrompt` + copiar para área de transferência. (`components/PromptSheet.tsx`; system recolhível; clipboard com fallback)
- [x] Ligado às 4 superfícies (questions, fichamento_feedback, quiz, publish.draft). (StudyItemForm → questions; RecallSheet → quiz + fichamento_feedback; PublicationsPage → publish.draft)
- [x] i18n pt/en. Typecheck + build do mobile passam. Marcar BACKLOG. (`ai.*`; 123 testes mobile verdes)
