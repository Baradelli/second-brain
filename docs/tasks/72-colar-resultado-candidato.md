# Tarefa 72 — Colar resultado como candidato (com confirmação) + Settings de modo (Bloco P)

> Fecha o laço do modo cheap: o usuário **cola de volta** o que a IA respondeu, e isso vira um
> **candidato** a `Note`/`Publication` — **sempre com confirmação** (§9: nunca altera dado sem
> confirmar). Mais o alicerce de Settings para o modo (cheap/conectado). Frontend + pequeno
> ajuste de Settings no backend.

## Objetivo

Transformar a saída colada em conteúdo do app, sem que a IA escreva direto: o usuário revisa e
confirma. E registrar a preferência de **modo** do agente.

## Entregas

### Colar resultado (frontend)

- No `PromptSheet` (Tarefa 71), aba/passo **"Colei o resultado"**: textarea para colar a resposta.
  Ao confirmar, conforme a skill:
  - `study.questions` → preencher/atualizar as `questions` do `StudyItem`
    (`editStudyItem(id, { questions })`, parseando linhas) — **prévia editável** antes de salvar.
  - `study.fichamento_feedback`/`study.quiz` → criar uma `NOTE` com o texto (ou anexar ao
    fichamento) — prévia + confirmação.
  - `publish.draft` → preencher o rascunho da `Publication` (criar/atualizar `noteId` com o texto).
- **Nada é persistido sem o botão de confirmação.** O texto cru fica editável antes.

### Settings de modo (backend leve + UI)

- `Settings` ganha `aiMode` (`'cheap' | 'connected'`, default `'cheap'`) — migração + `shared`
  (`settingsResponseSchema`/`updateSettingsSchema`) + `SettingsPage` (toggle). A **chave de API**
  do modo conectado **não entra aqui** (fica para a 73, com nota de segurança).
- No modo `cheap`, as superfícies usam o `PromptSheet`; o `aiMode` só prepara o terreno para 73.

## Arquivos

- `components/PromptSheet.tsx` (passo "colar"), helpers de parse.
- `pages/SettingsPage.tsx` + `shared/settings.ts` + migração `Settings.aiMode`.
- `locales/*` — `ai.paste.*`, `settings.ai.*`.

## Fora de escopo

- Execução conectada/Anthropic e a chave de API (Tarefa 73).

## Definição de pronto

- [x] Colar resultado → **prévia editável** → confirmação → vira `questions`/`Note`/rascunho de `Publication`.
      (passo "colar" no `PromptSheet` com `apply`; study.questions→preenche o form; quiz/feedback→NOTE no editor; publish.draft→rascunho da Publication)
- [x] `Settings.aiMode` (migração + shared + toggle na tela), default `cheap`.
      (migração `settings_ai_mode`; `domain/settings`+repo+rota+`shared/settings`; toggle na `SettingsPage`)
- [x] i18n pt/en. Typecheck/testes/build passam. Marcar BACKLOG.
      (`ai.paste.*`/`settings.ai.*`; backend 368u/169i, shared 19, mobile 123 verdes; builds limpos)
