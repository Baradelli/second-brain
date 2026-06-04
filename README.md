# Segundo Cérebro — MVP 1

Um "segundo cérebro" pessoal: capturar ideias sem atrito, manter um ritmo diário
(devocional + reflexão) e revisar num ritual o que vale virar conhecimento. Uso pessoal
(single-user) por enquanto, mas o banco já nasce multiusuário.

> Esta é a branch **`MVP-1`**, com o núcleo vivo do produto pronto e documentado. A `main`
> mantém o README de início do projeto (pacote de planejamento).

---

## O que o MVP 1 entrega

O **núcleo vivo**: o mínimo para o sistema ser usado todo dia sem virar mais uma tarefa.

- **Ritual diário** — escrever o **devocional** e a **reflexão** do dia num editor decente
  (TipTap), com a regra "um por dia" por tipo, calculada no fuso do usuário.
- **Captura sem atrito** — jogar uma ideia num textarea e seguir a vida; cada captura entra
  numa fila de revisão.
- **Revisão (triagem)** — promover uma captura para anotação ou arquivá-la (com motivo).
- **Agenda de hoje** — uma tela que junta o estado do diário (feito/a fazer) + as capturas a
  revisar hoje.
- **Labels + perguntas-guia** — organizar em árvore e, no editor, abrir um painel de
  perguntas sugeridas (andaime para pensar, nunca obrigatório).
- **Anexos** — anexar foto/arquivo a uma nota (upload para o disco do servidor; OCR fica
  para o MVP 5).
- **Offline Nível 1** — capturar e escrever funcionam **sem sinal**: vão para uma fila local
  (IndexedDB) e sincronizam quando a conexão volta. O app abre offline (PWA/service worker).

**Fora do MVP 1** (deliberadamente): IA/embeddings/OCR/WhatsApp, biblioteca, objetivos e
eventos (Goal/Event), agenda-calendário, e resolução de conflito offline (Nível 2).

---

## Como foi construído (o processo)

O projeto não foi escrito "de uma vez". Ele nasceu de um plano fatiado em **24 tarefas
pequenas e ordenadas** (`docs/BACKLOG.md`), executadas **uma de cada vez** com um ciclo
fixo. As regras invioláveis estão em `CLAUDE.md`; o plano conceitual em
`docs/plano-segundo-cerebro.md`.

### TDD outside-in, domínio primeiro

A ordem de cada fatia foi sempre a mesma:

1. definir o mini-domínio só da fatia atual;
2. escrever o contrato do UseCase;
3. **escrever os testes do UseCase primeiro** (com Repository fake em memória);
4. implementar o mínimo para passar (red → green);
5. refatorar mantendo verde;
6. **só então** criar rota/tela.

Por isso o domínio nasceu coberto por testes e as bordas (rotas/UI) foram testadas só onde
quebram em silêncio. Hoje são **~230 testes** (Vitest) entre domínio, contrato de repositório,
integração de rotas e fluxos de UI.

### Arquitetura em camadas (DDD-lite)

```
Rota/Controller (Fastify) → UseCase → Repository (interface) → Prisma
   valida com Zod           regra      contrato de              impl real
   (borda)                  negócio    persistência     (+ fake em memória nos testes)
```

- A **Rota** valida com Zod e chama o UseCase — sem regra de negócio.
- O **UseCase** tem a regra e não conhece Fastify nem Prisma (depende só de interfaces).
- O **Repository** é interface, com duas implementações: Prisma (produção) e fake (testes).

A ordem geral do backlog foi: **domínio → persistência → rota → tela**, e o frontend veio
**mobile-first** (o caso crítico é capturar/escrever no celular).

### Decisões que valem registrar

- **Datas com Luxon**, nunca `new Date` para lógica de calendário/fuso. O banco guarda UTC;
  "que dia é hoje" sempre se calcula no `timezone` de Settings (helpers em `domain/`).
- **Schemas Zod ficam em `shared/`**: um schema valida, infere tipos e alimenta o OpenAPI —
  back e front importam de lá, sem duplicar.
- **Idioma:** código/identificadores em inglês; conteúdo do usuário em português. UI 100%
  via i18n (`react-i18next`, pt default, en).
- **Progresso/streak/pendência são calculados** a partir dos dados, nunca guardados. Soft
  delete via `status` + `archivedAt`.
- **Offline:** fila de comandos serializáveis em IndexedDB; sync em ordem, removendo só após
  sucesso (não duplica). Premissa single-user "last-write-wins" — sem merge (isso é Nível 2).

O histórico de commits (`git log`) acompanha tarefa a tarefa essa construção.

---

## Stack

| Camada      | Tecnologia                                                                  |
| ----------- | --------------------------------------------------------------------------- |
| Monorepo    | pnpm workspaces (`shared`, `ui`, `backend`, `web`, `mobile`)                |
| Backend     | Node.js + TypeScript + **Fastify** (sem BFF separado; agrega via endpoints) |
| Validação   | **Zod** + `fastify-type-provider-zod` + Swagger (OpenAPI de graça)          |
| ORM/Banco   | **Prisma** + **PostgreSQL** (pgvector só no MVP 4)                          |
| Frontend    | **React + Vite (PWA)**, NÃO Next. Editor: **TipTap**. Forms: RHF + Zod      |
| Estilização | **Tailwind CSS** (tokens compartilhados via `ui/`)                          |
| i18n        | react-i18next (pt default, en)                                              |
| Offline     | Service Worker (Vite PWA) + fila local em **IndexedDB** (`idb`)             |
| Testes      | **Vitest** (+ Testing Library no front, fake-indexeddb no offline)          |

### Estrutura do monorepo

```
packages/
  shared/    # schemas Zod + tipos (fonte única de verdade entre back e front)
  ui/        # componentes React + tema (dark/light) compartilhados
  backend/   # Fastify: domain / usecases / repositories / routes + Prisma
  mobile/    # app principal (mobile-first), onde mora o caso crítico
  web/       # shell web mais simples (compartilha shared/ e ui/)
docs/        # plano, backlog, workflow e uma spec por tarefa (docs/tasks/)
```

---

## Como rodar

### Pré-requisitos

- Node.js 20+
- Docker + Docker Compose
- pnpm (`npm i -g pnpm`)

### 1. Instalar e configurar

```bash
pnpm install
cp .env.example packages/backend/.env   # ajuste se necessário
```

`packages/backend/.env` aceita:

```env
DATABASE_URL="postgresql://cerebro:cerebro@localhost:5432/cerebro?schema=public"
PORT=3333
UPLOAD_DIR="uploads"        # onde os anexos são gravados (servidos em /uploads/*)
CORS_ORIGIN=                # vazio = libera qualquer origem (dev)
```

### 2. Banco

```bash
pnpm db:up            # sobe o Postgres via Docker
pnpm prisma:migrate   # cria as tabelas do MVP 1
pnpm prisma:seed      # cria o usuário fixo "owner"
```

### 3. Subir

```bash
pnpm dev:backend      # Fastify em http://localhost:3333  (Swagger em /docs)
pnpm dev:mobile       # app mobile-first em http://localhost:5174
pnpm dev:web          # shell web em http://localhost:5173
```

### Testes e qualidade

```bash
pnpm test              # testes unit (domínio/UseCases/UI) — sem banco
pnpm test:integration  # testes de repositório/rota contra o Postgres real
pnpm lint              # ESLint
pnpm prettier          # checa formatação
```

---

## Como usar o app (MVP 1)

A navegação fica na barra inferior do mobile. As cinco abas:

- **Hoje** (tela inicial) — **é a "agenda do dia"**: saudação + data, os dois cartões do
  diário (Devocional / Reflexão, com estado feito ou a fazer), as capturas a revisar hoje e
  um campo de captura rápida no rodapé. Tocar num cartão abre o editor daquele momento.
- **Biblioteca** — listagem (cresce nos próximos MVPs).
- **Capturar** (botão central) — escreve uma ideia e ela entra na fila de pendentes;
  abaixo, a lista para **revisar**: cada item pode ser **promovido → Nota** (escolhendo o
  tipo) ou **arquivado**. Há também a seção de arquivados.
- **Escrever** — o editor (TipTap). Salva sozinho (debounce). No topo: botão **Perguntas**
  (abre o painel de perguntas-guia agrupadas por label) e botão **Foto** (anexa uma imagem
  à nota; no celular abre câmera/galeria).
- **Assistente** — placeholder (IA é MVP 4–5).

### Fluxo do dia

1. De manhã, abra **Hoje** → cartão **Devocional** → escreva. À noite, **Reflexão**.
2. Teve uma ideia no meio do dia? **Capturar** (funciona até sem internet).
3. No ritual de revisão, abra **Capturar** e triagem a fila: o que vale vira nota, o resto
   arquiva.

### Offline

Capturar e escrever funcionam sem sinal — o conteúdo vai para uma fila local e sincroniza
sozinho quando a conexão volta (o app mostra "salvo offline"). O app também **abre offline**
porque o service worker faz cache do shell. Para testar de verdade: `pnpm --filter
@cerebro/mobile build` e sirva o `dist/` (ex.: `pnpm --filter @cerebro/mobile preview`),
depois desligue a rede no DevTools.

---

## API (endpoints do MVP 1)

Documentação interativa (OpenAPI) em **`http://localhost:3333/docs`**.

| Método | Rota                          | O quê                                      |
| ------ | ----------------------------- | ------------------------------------------ |
| POST   | `/notes`                      | cria anotação (deriva `plainText` do doc)  |
| GET    | `/notes`                      | lista notas (filtros por tipo/escopo/data) |
| GET    | `/notes/:id`                  | busca uma nota                             |
| PATCH  | `/notes/:id`                  | edita uma nota                             |
| GET    | `/notes/suggested-questions`  | perguntas-guia por labels, agrupadas       |
| POST   | `/notes/:id/attachments`      | vincula um anexo (URL + metadados) à nota  |
| GET    | `/notes/:id/attachments`      | lista anexos da nota                       |
| POST   | `/uploads`                    | upload de arquivo → devolve a URL pública  |
| POST   | `/captures`                   | cria captura                               |
| GET    | `/captures?status=`           | lista capturas (pendentes / arquivadas)    |
| POST   | `/captures/:id/archive`       | arquiva captura (com motivo)               |
| POST   | `/captures/:id/promote`       | promove captura → nota                     |
| GET    | `/agenda?day=today`           | monta a agenda do dia (diário + revisão)   |
| POST   | `/labels`                     | cria label                                 |
| GET    | `/labels`                     | lista labels em árvore                     |
| POST   | `/labels/:id/archive`         | arquiva label                              |
| POST   | `/labels/:id/questions`       | cria pergunta-guia num label               |
| POST   | `/guide-questions/:id/toggle` | ativa/desativa pergunta-guia               |

---

## Modelo de dados (MVP 1)

Tabelas: **User, Settings, Label, GuideQuestion, Capture, Note, Attachment**
(`packages/backend/prisma/schema.prisma`). `Resource`, `Goal`, `Event` e `Embedding` entram
nas fases seguintes — fora agora para evitar migrações grandes e mortas.

---

## Próximos passos

- **MVP 2** — biblioteca, **objetivos e eventos** (Goal/Event) e a agenda-calendário
  (tarefas, passado/futuro) que estende a "agenda de hoje".
- **MVP 4–5** — IA, embeddings/busca semântica (pgvector), OCR de página manuscrita.

Mapa de progresso e o detalhe de cada fatia: `docs/BACKLOG.md` e `docs/tasks/`.
