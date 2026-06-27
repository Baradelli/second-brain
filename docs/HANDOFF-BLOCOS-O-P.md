# Prompt de handoff — executar Blocos O e P (Leitura Retentiva)

> Cole isto como prompt inicial do próximo agente. É auto-suficiente: diz o que ler, como o projeto
> trabalha, o que já existe, o que falta e como entregar cada fatia.

---

Você vai dar continuidade ao recurso **"Leitura Retentiva"** do app Ghost Brain (monorepo pessoal,
single-user). O **Bloco N já está pronto e em `main`**. Sua missão é executar os **Blocos O e P**,
**uma tarefa de cada vez**, na ordem do `docs/BACKLOG.md`, seguindo o fluxo TDD/DDD do projeto.

## 1. Leia primeiro (nesta ordem), antes de tocar em código

1. `CLAUDE.md` (raiz) — regras inegociáveis do projeto.
2. `docs/CONVENCOES-CODIGO.md` — convenções de código (em conflito com specs, vale este arquivo).
3. `docs/LEITURA-RETENTIVA.md` — o design do recurso (modelo, mapa práticas→features, §5 Publicação,
   §6 Agente IA prompt-first). **Leia inteiro.**
4. `docs/BACKLOG.md` — seção "Leitura Retentiva": decisões fechadas + sequência dos Blocos N/O/P.
5. `docs/plano-segundo-cerebro.md` **§9 (Limites do agente)** — obrigatório para o Bloco P (IA).
6. A spec da tarefa que você for executar, em `docs/tasks/NN-*.md`.

## 2. Como o projeto trabalha (resumo das regras)

- **Camadas (DDD-lite):** Rota (Fastify, valida com Zod) → UseCase (regra; **não** importa Fastify
  nem Prisma; depende de interfaces de Repository) → Repository (interface + impl Prisma + **fake em
  memória** nos testes). Entidades simples.
- **TDD outside-in ESTRITO no domínio/UseCases:** escreva o teste **antes**, com fake repo; red →
  green → refactor; **uma fatia vertical por vez** (um teste → uma implementação). Nunca escreva a
  implementação do UseCase antes do teste.
- **Política de testes:** UseCase/domínio = cobertura alta (fake, sem banco). Repository = 1 teste de
  contrato contra Prisma real (`*.integration.test.ts`). Rotas = integração só nos caminhos críticos.
  UI = só fluxos que quebram em silêncio (confie em typecheck + build).
- **Idioma:** código em inglês (tabelas, campos, funções, rotas), conteúdo em português. i18n no
  front: nenhum texto solto — tudo via `t('chave')`, chaves semânticas em inglês, `pt.json` e
  `en.json`.
- **Zod em `packages/shared/src/`** é fonte única (back valida, front tipa). Exporte no `index.ts`.
- **Datas:** banco em UTC; "que dia é hoje" calcula no `timezone` do `Settings` com **Luxon** e os
  helpers de `src/domain/` (ex.: `dayRange`). Nunca `new Date` para lógica de calendário/fuso.
- **Soft delete:** entidades de UI usam `status` (`GeneralStatus`) + `archivedAt`. Logs (Event,
  Recall) são imutáveis (sem status); desfazer = hard delete.
- **Progresso/agendamento são calculados**, nunca guardados.

## 3. Fluxo de execução (siga à risca)

1. Pegue **uma** tarefa de `docs/tasks/` na ordem do BACKLOG.
2. Se a spec tiver "Decisões que assumi (revisar antes de executar)" e algo for ambíguo/sensível,
   **pergunte ao dono antes**. Caso contrário, siga a spec como escrita (não reduza escopo).
3. Cumpra o ciclo TDD (red→green→refactor). Rode os testes a cada passo.
4. Antes de declarar pronto: rode **lint + prettier + typecheck + testes** (ver §4) e confirme verde.
5. Marque a tarefa no `docs/BACKLOG.md` (`[x]`) e a "Definição de pronto" da spec.
6. **Pare e reporte** o que foi feito vs a "Definição de pronto". **Não emende a próxima tarefa** sem
   o dono revisar — salvo se o dono pedir explicitamente para seguir o bloco inteiro.

## 4. Ambiente e comandos (Windows; pnpm workspaces)

- **Banco (Postgres em Docker):** o container `cerebro_db` existe; o `.env` aponta para
  `localhost:5432`. Se os testes de integração falharem por conexão, rode `docker start cerebro_db`
  e confirme com `npx prisma migrate status` (em `packages/backend`).
- **Migrações:** em `packages/backend`, `npx prisma migrate dev --name <nome>` (aplica + `generate`).
- **Testes backend:** `packages/backend` → `npm run test` (unit) e `npm run test:integration`
  (precisa do banco). Split por nome de arquivo: `*.integration.test.ts` = integração; o resto = unit.
- **Frontend (mobile):** `packages/mobile` → `npm run typecheck`, `npm run test`, `npm run build`.
- **Lint/format (raiz):** `npx eslint . --fix` e `npx prettier --write "<globs>"`. O eslint usa
  `simple-import-sort` (imports são reordenados — rode o --fix antes de commitar).
- **`@cerebro/shared` é consumido direto de `src`** (sem build): novos exports já resolvem em back e
  front.

## 5. Onde as coisas vivem (mapa rápido)

- **Backend:** `packages/backend/src/` → `domain/` (entidades + helpers puros), `usecases/` (+
  `ports/` interfaces, `_fakes/` fakes, `__tests__/`), `repositories/` (Prisma + `__tests__/*.integration`),
  `routes/`, `http/server.ts` (registro das rotas, escopo autenticado — `req.user.sub` = userId).
- **Shared:** `packages/shared/src/*.ts` + `index.ts`.
- **Mobile:** `packages/mobile/src/` → `router.tsx` (rotas), `App.tsx` (nav sidebar/tabs),
  `lib/api/endpoints.ts` + `client.ts` (fetch tipado por Zod; `get/post/patch/del`), `pages/`,
  `components/`, `locales/{pt,en}.json` (chaves planas com ponto). UI vem de `@cerebro/ui`
  (`Button`, `Input`, `Card`, `BottomSheet`, `EmptyState`, `SectionHeader`). Forms = React Hook Form
  + `zodResolver`. Dados = `fetch + useState/useEffect` com guard de cancelamento.

## 6. O que JÁ está pronto (Bloco N — use como espelho)

Motor de revisão espaçada + recuperação ativa, **em `main`** (commits `e1f2660`, `7c90878`):

- Domínio: `domain/study-item.ts`, `domain/recall.ts`, `domain/recall-schedule.ts` (escada
  `[2,7,30]`, consolidação após 3, `dueToday/overdue` por dia local).
- UseCases: `create/edit/archive-study-item.ts`, `log-recall.ts`, `undo-recall.ts`,
  `list-study-items.ts`, `select-due-recalls.ts` (+ fakes + testes).
- Persistência: `prisma-study-item-repository.ts`, `prisma-recall-repository.ts` (+ contratos).
- Rotas: `routes/study-item-routes.ts` (registrada no `server.ts`); agenda ganhou `recallsDue`
  (`build-today-agenda.ts` + `agenda-routes.ts`).
- Frontend: `pages/StudyItemsPage.tsx` (lista + `RecallSheet` A/B/C + fichamento 2 fases),
  `components/StudyItemForm.tsx`, seção "Revisões de hoje" na `AgendaPage.tsx`, rota `/study`, nav
  "Estudos", i18n `study.*`/`review.*`.

**Padrões a espelhar:**
- Nova entidade (migração) → veja `tasks/58` + os arquivos `study-item`/`recall`.
- UseCase + repo + rota + Zod → espelhe `Resource`: `shared/resource.ts`,
  `repositories/prisma-resource-repository.ts`, `routes/resource-routes.ts`,
  `usecases/create-resource.ts`/`edit-resource.ts`/`list-resources.ts`, e seus testes.
- Tela nova → espelhe `pages/StudyItemsPage.tsx` e `pages/LibraryPage.tsx` + `components/ResourceForm.tsx`.
- Acréscimo na agenda → veja como `recallsDue` entrou (`select-due-recalls.ts` +
  `build-today-agenda.ts` + `agenda-routes.ts`), retrocompatível.

## 7. O que FALTA — sua fila

Execute **nesta ordem** (specs detalhadas já existem em `docs/tasks/`):

**Bloco O — Ensinar para Reter (publicação):**
- `66-migracao-dominio-publication.md` — entidade `Publication` (mirror de `Resource`: `stage`
  pipeline ≠ `status` soft-delete; fonte `sourceType`/`sourceId` sem FK; rascunho via `noteId`).
- `67-usecases-repo-rota-publication.md` — UseCases (TDD) + Prisma + Zod + rotas `/publications`.
- `68-gatilho-publicacao.md` — `PublishTrigger` (frontend) a partir de fichamento/recap.
- `69-tela-pipeline-publicacoes.md` — `PublicationsPage` (pipeline idea/draft/published).

**Bloco P — Agente IA (prompt-first; modo cheap primeiro, conectado depois):**
- `70-promptbuilder-shared.md` — `buildPrompt` puro em `shared/` (4 skills, pt/en, **moldura do §9**
  no `system`). É o "produto". TDD.
- `71-modo-cheap-copiar-prompt.md` — `PromptSheet` "Copiar prompt" (frontend puro; sem chave/custo).
- `72-colar-resultado-candidato.md` — colar resposta → **prévia editável → confirmação** vira
  `questions`/`Note`/rascunho; `Settings.aiMode` (default `cheap`).
- `73-modo-conectado-anthropic.md` — *(futuro, só quando o dono pedir)* porta `AiRunner` +
  `AnthropicRunner` + `POST /ai/run`; chave **só no servidor** (env), nunca no cliente.

**Regras de ouro do Bloco P (do §9, inegociáveis):** o agente é espelho, não piloto. Pode
sugerir/resumir/encontrar/apontar; **nunca** altera dado sem confirmação, conclui objetivo,
arquiva sozinho, decide no campo espiritual/devocional, nem finge certeza. Toda saída de IA é
**candidato** que o dono confirma. No modo cheap a IA não toca em dado nenhum.

## 8. Commit (quando o dono pedir)

- O dono trabalha em `main`, mas **crie uma branch** por fatia/bloco (`feat/...`), commit lá e faça
  **fast-forward** para `main` (`git merge --ff-only`).
- **Não inclua `packages/backend/prisma/seed.ts`** no commit (é WIP do dono; deixe fora).
- Rode lint/prettier antes; mensagens de commit descritivas; finalize a mensagem com:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## 9. Comece assim

Confirme o ambiente (`docker start cerebro_db` se preciso; `npm run test`/`test:integration` no
backend verdes), leia a spec da **Tarefa 66**, e execute-a até a "Definição de pronto" — então pare
e reporte. Se o dono disser "siga o bloco", continue 67→68→69 e depois o Bloco P, sempre parando
para revisão ao fim de cada tarefa.
