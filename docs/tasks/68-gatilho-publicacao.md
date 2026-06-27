# Tarefa 68 — Gatilho de publicação (a partir de fichamento/nota/recap) (Bloco O)

> Frontend (mobile) + um helper de leitura. Transforma o convite "virar isso num post/aula?" em
> ação de baixo atrito a partir de um artefato de estudo, em **tom de convite** (plano §1,
> anti-culpa). Confia em typecheck + build.

## Objetivo

Dado um artefato (fichamento `STUDY_NOTE`, nota qualquer, ou recap), criar uma `Publication` em
`stage='idea'`, opcionalmente já com um rascunho (`noteId`) semeado a partir do conteúdo da fonte.

## Comportamento

- **Componente `PublishTrigger`** (botão + `BottomSheet` com seletor de **formato**
  linkedin/substack/blog/lesson/video). `onConfirm(format)`:
  1. `createPublication({ sourceType, sourceId, format, title })` (title derivado da fonte).
  2. _(opcional, recomendado)_ semear rascunho: se a fonte tem texto (ex.: `note.plainText`),
     criar uma `STUDY_NOTE`/`NOTE` de rascunho pré-preenchida e `editPublication(id, { noteId })`.
     Decisão: por ora, criar rascunho **vazio** e deixar o texto-semente para o Bloco P (IA);
     o gatilho só cria a `idea`. _(revisável)_
  3. Toast/realimentação discreta; navegar para `/publications` (Tarefa 69) é opcional.
- **Pontos de entrada (surfaces):**
  - `RecallSheet`/fichamento (`StudyItemsPage`): "transformar em publicação" quando há fichamento.
  - `RecapsPage`: em cada recap, "virar post/aula".
  - `ResourceDetailPage` / nota: entrada secundária (opcional nesta fatia).
- **i18n** `publish.*` (trigger, formatos, convite) em pt/en. Os rótulos de formato:
  `publish.format.{linkedin,substack,blog,lesson,video}`.

## Arquivos

- `components/PublishTrigger.tsx` (novo).
- `pages/StudyItemsPage.tsx` + `pages/RecapsPage.tsx` — instâncias do trigger.
- `locales/pt.json` + `en.json` — `publish.*`.

## Fora de escopo

- Semear rascunho via IA (Bloco P). Tela de pipeline (69).

## Definição de pronto

- [ ] `PublishTrigger` cria `Publication` (`idea`) com formato escolhido, a partir de fichamento e recap.
- [ ] Tom de convite; i18n pt/en.
- [ ] Typecheck + build do mobile passam. Marcar BACKLOG.
