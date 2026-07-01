# ADR 0006 — Objetivo de leitura: Goal aponta para Resource

- Status: aceito
- Data: 2026-07-01
- Fase: Recurso como hub + objetivo de leitura

## Contexto

O dono quer que **ler um recurso** seja um compromisso rastreável ("ler _Confissões_ até tal
data", "10 páginas por dia") e que esse progresso apareça **na tela do recurso**. Até aqui
`Goal` e `Resource` eram entidades totalmente separadas: `Goal` não tinha nenhum vínculo com
`Resource` (embora o plano-mestre já dissesse "Goal pode apontar para Resource"). O dono
também relatou que o objetivo "não funcionava" — bug à parte (o `+` do web criava um HABIT sem
cadência), a leitura não tinha para onde apontar.

Pergunta de modelagem: **onde mora o progresso de leitura de um recurso?**

## Decisão

`Goal` ganha um campo **opcional `resourceId`** (FK para `Resource`). Um **objetivo de leitura**
é um `Goal` comum — normalmente `PROJECT` com `targetValue` (páginas) e `dueAt` opcional —
cujo `resourceId` aponta para o recurso. Não há tipo novo de Goal.

- **Progresso continua CALCULADO.** "Registrar leitura de hoje" é um `checkGoal` com valor; o
  progresso vem de `ComputeGoalProgress` sobre os `Event`s, como qualquer Goal. Nada de
  progresso guardado no `Resource`.
- **Validação no UseCase.** `CreateGoal`/`EditGoal` recebem um `ResourceRepository` (opcional)
  e, quando `resourceId` é informado, exigem que o recurso **exista e seja do dono**
  (`InvalidGoalError`). Callers que nunca criam goal ligado a recurso (agenda, promoção de
  captura) seguem construindo `CreateGoal` só com o `GoalRepository`.
- **Integridade na exclusão.** `DeleteResource` passa a **bloquear o hard-delete** se houver
  goal ativo apontando para o recurso (`ResourceHasReferencesError`), na mesma filosofia do
  ADR 0004 (não deixar referência forte órfã). No banco a FK é `ON DELETE SET NULL`, mas o
  bloqueio real mora no usecase.
- **Listagem.** `ListActiveGoals` aceita filtro `resourceId`; a tela do recurso usa
  `GET /goals?resourceId=…` para achar o(s) objetivo(s) de leitura e mostrar o anel de
  progresso + "registrar leitura".

## Alternativas consideradas

- **Progresso mora no `Resource`** (campo `currentPage`/`percent`). Rejeitada: criaria um
  segundo lugar de "progresso guardado", contra a regra do projeto de que progresso é sempre
  **calculado** a partir de eventos — e duplicaria a máquina de `Event`/`ComputeGoalProgress`
  que já existe.
- **Os dois combinados** (posição no recurso + cadência no Goal). Rejeitada por complexidade
  sem ganho no momento; o Goal sozinho já modela alvo, prazo e ritmo.
- **Novo `Goal.type = 'READING'`.** Rejeitada: desnecessário. `PROJECT`/`TARGET` já modelam
  "acumular até um total"; um tipo novo exigiria regras próprias sem benefício.

## Consequências

- (+) Reusa toda a máquina de `Goal`/`Event`/progresso, cadência e arquivamento — objetivo de
  leitura não é um caminho especial, é um Goal com `resourceId`.
- (+) O hub do recurso mostra progresso de leitura e "registrar leitura de hoje" sem inventar
  entidade nova.
- (+) `resourceId` opcional: goals sem recurso (hábitos, alvos gerais) seguem idênticos;
  migração é só uma coluna `TEXT` nullable + índice.
- (−) A validação de posse do recurso vive no UseCase (não numa FK forte com `RESTRICT`), então
  depende de o caller injetar o `ResourceRepository`. É consistente com o resto do domínio
  (regra no UseCase, banco como detalhe).
