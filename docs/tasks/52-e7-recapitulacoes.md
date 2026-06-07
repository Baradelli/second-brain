# Tarefa 52 — E7: recapitulações na tela

> **Bloco E**, item E7 (último). Recap = uma **Note** journal (DEVOTIONAL/REFLECTION) com
> `scope` WEEK/MONTH/YEAR. Os usecases (`UpsertRecap`/`UpsertJournalNote`) já existem e são
> testados, mas **sem rota nem tela**. Aqui: ligar uma rota fina e fazer a tela.

## Decisões (fechadas)

- Recap pode ser **Devocional ou Reflexão**, nos 3 períodos (semana/mês/ano).
- Acesso: item **"Recapitulações"** no **sidebar** + atalho no topo do **Calendário**.

## Backend (fino)

- Rota `POST /recaps` (body `{ userId, type: DEVOTIONAL|REFLECTION, scope: WEEK|MONTH|YEAR }`):
  lê `timezone`/`reviewWeekday` do Settings e chama `UpsertRecap` (mode `create-or-get`,
  `reference = now`, `doc` vazio) → devolve a Note (acha-ou-cria a do período atual). Reaproveita
  toda a lógica de fuso/início-de-semana já testada — sem conta de data no cliente.
- `shared/src/recap.ts`: `recapScope`, `createRecapSchema`. Resposta reusa `noteResponseSchema`.
- Listagem **reusa `GET /notes?scope=…&status=ACTIVE`** (notas WEEK/MONTH/YEAR são só recaps).

## Frontend

- `listNotes` ganha o parâmetro `scope`; novo `createRecap(type, scope)`.
- **`RecapsPage`** (`/recaps`): seções **Semana / Mês / Ano**. Cada seção lista os recaps daquele
  scope (rótulo por período + tipo) → tocar abre no **editor** (`/editor/:id`); botão **"Novo"** →
  escolher **Devocional/Reflexão** → `createRecap` → abre no editor. O editor **não muda** (edita
  por id; já reflete o tipo real — E2).
- Navegação: item no **sidebar** + botão no cabeçalho do **Calendário** → `/recaps`.
- i18n pt/en (`nav.recaps`, `recaps.*`).

## Testes

- **Rota** (integração): `POST /recaps` cria recap WEEK/REFLECTION (scope/type corretos); 2ª
  chamada do mesmo período devolve o mesmo id; scope inválido → 400.
- **UI** `recaps.test.tsx`: lista recaps de um scope; "Novo" → escolher tipo → `createRecap` →
  navega ao editor.

## Definição de pronto

- [x] `POST /recaps` (via `UpsertRecap`) + `recap*` em `shared/`; `listNotes` aceita `scope`.
- [x] `RecapsPage` + `createRecap`; sidebar + atalho no Calendário; i18n pt/en.
- [x] back rota (3) + mobile **119** verdes; integração **128**; typechecks/lint limpos; sem regressões.
- [x] Marcar E7 e **fechar o Bloco E**.
