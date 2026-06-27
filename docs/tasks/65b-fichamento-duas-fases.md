# Tarefa 65b — Fichamento de memória em duas fases (+ auto-vínculo)

> Refinamento do Bloco N que fecha de verdade as **Práticas 1 e 6**: escrever **de memória,
> sem olhar** (fase 1) e depois **comparar com o material** (fase 2) — o "choque". Hoje o
> `StudyItem` já tem `fichamentoNoteId`, mas a UI não o vincula nem enquadra o ritual.
> Frontend (mobile); backend já suporta tudo (`editStudyItem` aceita `fichamentoNoteId`).

## Objetivo

Do `RecallSheet`/`StudyItemsPage`, oferecer o fichamento como ritual de duas fases e **vincular
automaticamente** a `STUDY_NOTE` criada ao `StudyItem`.

## Comportamento

- **Sem fichamento ainda** (`item.fichamentoNoteId == null`): CTA primário **"Escrever de memória
  (sem olhar)"** com microcopy reforçando: feche o livro/marcações, reconstrua de memória.
  Ao tocar:
  1. `createNote({ type: 'STUDY_NOTE', doc: docVazio, resourceId: item.resourceId ?? undefined, title: item.title })`.
  2. `editStudyItem(item.id, { fichamentoNoteId: nota.id })` (auto-vínculo).
  3. `navigate('/editor/' + nota.id)`.
- **Com fichamento** (`fichamentoNoteId != null`): dois botões —
  **"Ver/editar fichamento"** (`/editor/:id`) e **"Comparar com o material"** (abre o recurso
  `/library/:resourceId` quando houver; senão oculta) — enquadrando a fase 2 (o choque).
- A lista (`StudyItemsPage`) pode exibir um indicador discreto de "tem fichamento".

## Arquivos

- `packages/mobile/src/pages/StudyItemsPage.tsx` — lógica `ensureFichamento(item)` (create+link+nav)
  e os botões condicionais no `RecallSheet`; recarregar a lista após vincular.
- `packages/mobile/src/lib/api/endpoints.ts` — reuso de `createNote`/`editStudyItem` (sem novos).
- i18n `study.fichamento.*` (blindHint, phase1, view, compare) em pt/en.

## Fora de escopo

- Forçar tecnicamente o "não olhar" (é enquadramento/UX, não trava). Edição/arquivamento de item.

## Definição de pronto

- [x] "Escrever de memória" cria a `STUDY_NOTE` e **vincula** `fichamentoNoteId` ao item.
- [x] Com fichamento, aparecem "ver/editar" e "comparar com o material".
- [x] Microcopy de "sem olhar" presente; i18n pt/en.
- [x] Typecheck, testes (123) e build do mobile passam.
- [x] Marcar BACKLOG.
