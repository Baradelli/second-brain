# Tarefa 63 — Tela: criar `StudyItem` + fichamento de memória

> Frontend (mobile). Segue os padrões de `LibraryPage`/`ResourceForm`/`ResourceDetailPage`
> (Tailwind + tokens `--cerebro-*`, `@cerebro/ui`, RHF + zod, fetch + useState/useEffect com guard).
> Política de testes de UI do projeto: só o que quebra em silêncio — aqui confiamos em typecheck + build.

## Objetivo

Permitir criar um item de estudo e escrever o **fichamento de memória** (Práticas 1/6) a partir de
um `Resource` ou avulso, e listar os itens com seu agendamento.

## Entregas

- **`StudyItemForm`** (`components/StudyItemForm.tsx`): RHF + zod. Campos: `title` (obrigatório),
  `reference` (opcional), perguntas **antes/durante/depois** (3 textareas; cada linha = uma
  pergunta → arrays). `onSubmit(body: CreateStudyItemInput)`. Reusa `Input`/`Button`.
- **`StudyItemsPage`** (`pages/StudyItemsPage.tsx`, rota `/study`): lista `listStudyItems()` com
  card por item (título, `reference`, badge de agendamento: "consolidado" / "revisar hoje"
  (destaque se `overdue`) / "próxima: <data>"). Botão **criar** abre `BottomSheet` com
  `StudyItemForm`. Estados loading/error/empty no padrão. Lê query `?new=1&resourceId=…` para já
  abrir o form vinculado a um recurso (entry point da ResourceDetailPage).
- **Fichamento (duas fases):** no card/numa ação, **"escrever de memória"** abre o editor
  (`/editor?type=STUDY_NOTE&resourceId=…`) — fase (a) escrever sem olhar; o usuário compara depois.
  (Auto-vincular `fichamentoNoteId` fica como melhoria; por ora o fichamento é uma `STUDY_NOTE`.)
- **Rota** `/study` em `router.tsx`; **nav** "Estudos" no `App.tsx` (se o menu comportar).
- **Entry point** em `ResourceDetailPage`: botão "Item de estudo" → `navigate('/study?new=1&resourceId='+id)`.
- **i18n** `study.*` em `pt.json` e `en.json`.

## Definição de pronto

- [x] `StudyItemForm` + `StudyItemsPage` + rota `/study` + nav "Estudos" + entry point no ResourceDetailPage.
- [x] i18n pt/en. Typecheck, testes (123) e build do mobile passam.
- [x] Marcar BACKLOG.
