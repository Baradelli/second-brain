# BACKLOG.md — MVP 1 fatiado

> O MVP 1 é o **núcleo vivo**: ritual diário (devocional + reflexão) + captura + revisão
> manual. Tabelas: User, Settings, Capture, Note, Label, Attachment, GuideQuestion.
> Cada linha abaixo é uma tarefa pequena, na ordem de execução. Marque o status conforme
> aprova. Detalhe de cada uma em `docs/tasks/`.

## Legenda de status

`[ ]` a fazer · `[~]` em revisão · `[x]` feito

## Sequência do MVP 1

> A ordem é deliberada: domínio primeiro (testável sem nada), depois persistência, depois
> rota, depois tela. Cada tarefa nasce com testes conforme a política do `CLAUDE.md`.

### Bloco A — Anotação (o coração da escrita)

- [x] **01** — Domínio + UseCase `createNote` (deriva `plainText` do doc; valida type/scope). → `tasks/01-usecase-criar-anotacao.md`
- [x] **02** — Repository de Note: interface + fake em memória (usado pelos testes). → `tasks/02-repository-anotacao.md`
- [x] **03** — Implementação Prisma do Repository de Note + teste de contrato. → `tasks/03-prisma-anotacao.md`
- [x] **04** — Schema Zod em `shared/` + rota `POST /notes` + `GET /notes` (Swagger sai de graça). → `tasks/04-rota-anotacoes.md`
- [x] **05** — UseCase `editNote` + `findNoteOfTheDay` (devocional/reflexão de hoje). → `tasks/05-usecase-editar-buscar-anotacao.md`
- [x] **05b** — Migrar de `new Date` para **Luxon** (datas/fuso) + centralizar em helpers. → `tasks/05b-migrar-para-luxon.md`

### Bloco B — Diário (devocional + reflexão)

- [x] **06** — Regra "um devocional/uma reflexão por dia" na aplicação (com timezone da Config). → `tasks/06-regra-diario-por-dia.md`
- [x] **07** — UseCase de recapitulação: criar Note de escopo WEEK/MONTH/YEAR. → `tasks/07-usecase-recapitulacao.md`

### Bloco C — Captura

- [x] **08** — Domínio + UseCase `createCapture` (texto livre + revisarEm padrão pela Config). → `tasks/08-usecase-criar-captura.md`
- [x] **09** — Repository de Capture (interface + fake + Prisma + contrato). → `tasks/09-repository-captura.md`
- [x] **10** — UseCase `listPendingCaptures` e `listArchived`. → `tasks/10-usecase-listar-capturas.md`
- [x] **11** — Rota de Capture (`POST /captures`, `GET /captures?status=`). → `tasks/11-rota-capturas.md`

### Bloco D — Revisão (triagem do MVP 1)

- [x] **12** — UseCase `archiveCapture` (status + arquivadoEm + motivo). → `tasks/12-usecase-arquivar-captura.md`
- [x] **13** — UseCase `promoteCaptureToNote` (marca destino: promotedToType/Id). → `tasks/13-usecase-promover-captura.md`

### Bloco E — Agenda do dia

- [x] **14** — UseCase `buildTodayAgenda` (momentos de diário + capturas a revisar hoje). → `tasks/14-usecase-agenda-do-dia.md`
- [x] **15** — Rota `GET /agenda?day=today`. → `tasks/15-rota-agenda.md`

### Bloco F — Labels + Anexos (suporte à escrita)

- [x] **16** — Domínio + UseCases de Label (criar, listar em árvore, vincular a item). → `tasks/16-usecase-labels.md`
- [x] **17** — PerguntaGuia por label + UseCase `suggestedQuestionsForNote` (agrupadas por label). → `tasks/17-usecase-perguntas-guia.md`
- [x] **18** — Attachment: UseCase `attachFile` a uma Note (só guardar URL/metadados; OCR fica pro MVP 5). → `tasks/18-usecase-anexo.md`

### Bloco G — Frontend (só depois do domínio pronto)

- [x] **19** — Setup do React + **Vite** (PWA) com `web/` e `mobile/` + pacote `ui/` compartilhado + i18n (react-i18next, pt/en) + roteamento + cliente HTTP usando os schemas de `shared/`. → `tasks/19-frontend-base.md`
- [x] **19b** — Sistema de design + tema dark/light + componentes-base (em `@cerebro/ui`). → `tasks/19b-design-system.md`
- [x] **20** — Tela do editor (TipTap) sobre o layout do protótipo; salva doc + plainText. → `tasks/20-tela-editor.md`
- [x] **21** — Tela de captura (textarea) + lista de pendentes + ação arquivar/promover. → `tasks/21-tela-captura-revisao.md`
- [x] **22** — Tela "Agenda de hoje" juntando diário + capturas a revisar. → `tasks/22-tela-agenda.md`
- [ ] **23** — Painel "perguntas sugeridas" + anexar foto na tela do editor. → `tasks/23-tela-perguntas-anexo.md`

### Bloco H — Offline Nível 1

- [ ] **24** — Service Worker + fila local para captura/escrita offline (sync ao voltar). → `tasks/24-offline-nivel-1.md`

## Definição de "MVP 1 pronto"

Eu consigo, todo dia, no celular e no PC: escrever meu devocional e minha reflexão num
editor decente; capturar uma ideia sem atrito (mesmo offline); ver a agenda do dia; e
revisar capturas pendentes (promover para anotação ou arquivar). Tudo com o domínio
coberto por testes. Sem IA, sem objetivos/biblioteca (isso é MVP 2).

---

> Os arquivos detalhados em `docs/tasks/` estão criados a partir da Tarefa 01. As demais
> serão detalhadas conforme avançamos (para não gerar 24 specs que envelhecem antes do uso).
> Quando chegar perto de uma tarefa ainda não detalhada, peça para detalhá-la.
