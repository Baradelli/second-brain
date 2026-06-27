# Tarefa 69 — Tela de pipeline de publicações (Bloco O)

> Frontend (mobile). Fecha o Bloco O: gerenciar publicações pelo pipeline idea→draft→published e
> escrever o rascunho no editor TipTap. Padrões de `LibraryPage`/`GoalsPage`. Confia em typecheck +
> build.

## Objetivo

Visualizar e mover publicações pelo funil, editar o rascunho e marcar como publicado.

## Entregas

- **`PublicationsPage`** (`pages/PublicationsPage.tsx`, rota `/publications`):
  - Carrega `listPublications()` e agrupa por `stage` em três seções (**Ideias / Rascunhos /
    Publicados**), cada card com título, **formato** (chip) e fonte.
  - Filtro por formato (chips, padrão dos filtros de `LibraryPage`).
  - **Avançar stage**: idea → draft → published (botão por card). Ao publicar, backend seta
    `publishedAt` (Tarefa 67); a UI mostra a data.
  - **Editar rascunho**: abre o editor. Se a publicação não tem `noteId`, criar `NOTE`/`STUDY_NOTE`
    de rascunho e `editPublication(id, { noteId })` (auto-vínculo, mesmo padrão do fichamento 65b),
    depois `navigate('/editor/:noteId')`.
  - **Editar metadados** (título/formato) via `BottomSheet` + form simples; **arquivar**.
  - Estados loading/error/empty no padrão.
- **Rota** `/publications` em `router.tsx`; **nav** "Publicações" no `App.tsx` (ícone `Megaphone`/`Send`).
- **i18n** `publish.*` (seções do pipeline, ações) em pt/en.

## Arquivos

- `pages/PublicationsPage.tsx` (novo); `router.tsx`; `App.tsx`; `locales/*`.
- (opcional) `components/PublicationForm.tsx` para editar metadados.

## Fora de escopo

- Geração de conteúdo por IA (Bloco P). Agendamento de publicação externa.

## Definição de pronto

- [x] `PublicationsPage` por stage (idea/draft/published) + filtro de formato + avançar stage +
      editar rascunho (auto-vínculo de `noteId`) + arquivar. (`pages/PublicationsPage.tsx`)
- [x] Rota + nav + i18n pt/en. Typecheck + build do mobile passam. (rota `/publications`; nav "Publicações"; `publish.*`/`nav.publications`)
- [x] Marcar BACKLOG. **Fim do Bloco O.** (123 testes mobile verdes; typecheck + build limpos)
