# Tarefas 82–83 — Bloco S: paridade de superfícies de IA

> Origem: `docs/ANALISE-E-PLANO-MELHORIA.md` §4 (Bloco S). Antes: web tinha só o hub
> (AssistantTab) e o mobile só o inline (PromptSheet) — cada plataforma tinha metade.

## 82 — Hub Assistente real no mobile

`AssistantPage` deixou de ser placeholder: chips com as 7 skills + campos vindos dos
descritores puros do shared (`skill-forms`) + `PromptSheet` (copiar prompt no cheap;
"Gerar com IA" no conectado). Resultado confirmado vira Note candidata aberta no
editor (§9). Entrada "Assistente" adicionada ao menu lateral (a rota `/assistant` já
existia órfã — pendência E6/AJUSTES-MVP2 #11 resolvida).

## 83 — PromptSheet no `ui` + IA inline no web

- `PromptSheet` movido de `packages/mobile/src/components/` para
  `packages/ui/src/components/` (não tinha nada mobile-specific); mobile importa de
  `@cerebro/ui`; ganhou os cases das 3 skills novas.
- Web `StudyItemDetailTab` ganhou a seção "Assistente" inline: perguntas-guia, quiz
  e — quando há fichamento — feedback e socrático (mesmos fluxos do mobile; nota
  candidata abre em aba).
- **Escopo registrado:** `publish.draft` inline no web continua servido pelo hub
  (AssistantTab); botão inline na aba de publicação fica como melhoria futura.

## Testes

Mobile 125 · web 140 · shared 50 — verdes; typechecks limpos (exceto os erros
pré-existentes de `mobile/src/__tests__/agenda.test.tsx`, anteriores a este bloco).
