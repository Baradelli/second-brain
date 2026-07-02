# Tarefa 77 — Ownership nas rotas `:id` (Bloco Q)

> Origem: `docs/ANALISE-E-PLANO-MELHORIA.md` §4 e `docs/AJUSTES-MVP2.md` item 5
> (limitação consciente anotada na task 54).

## Objetivo

Rotas por `:id` exigiam token válido mas não checavam o **dono** do recurso — um token
de qualquer usuário podia arquivar/editar/promover itens alheios. Auditoria encontrou
6 usecases com `byId` sem comparação de dono:

`archive-capture` · `archive-note` · `archive-label` · `edit-note` ·
`promote-capture-shared` (`loadPendingCapture`, usado pelos 3 promotes) ·
`toggle-guide-question` (dono via label, mesmo padrão do create).

## Regra

Dono errado = **NotFound** (mesma resposta de id inexistente — não vaza a existência
do recurso), o padrão já dominante nos demais usecases. `userId` entra no input de
cada usecase e as rotas passam `req.user.sub`. No promote→note, o timezone passa a
ser resolvido pelo usuário autenticado (não mais pelo dono da captura carregada).

## Testes

- `usecases/__tests__/ownership.test.ts`: 6 casos de intruso (unit, fakes).
- `note-routes.integration.test.ts`: intruso com token válido → PATCH e archive
  de nota alheia respondem 404 (modelo do goal-routes).

## Definição de pronto

Nenhum usecase mutador busca por id sem comparar `userId`; suíte completa verde.

## Fora de escopo

Throttling de login; RLS/escopo no repositório (padrão atual é guard no usecase).
