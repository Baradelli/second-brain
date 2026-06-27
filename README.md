# Ghost Brain 🧠

Um **"segundo cérebro" pessoal** — um app de PKM e produtividade que unifica quatro coisas
num só sistema, sem costurar apps separados:

1. **Captura sem atrito** de ideias (inbox).
2. **Ritual diário** — devocional de manhã, reflexão à noite, e recapitulações (semana/mês/ano).
3. **Base de conhecimento** — biblioteca de livros/cursos/vídeos + estudo que gruda (revisão
   espaçada, recuperação ativa, "ensinar para reter").
4. **Objetivos e agenda** — com check, progresso calculado e o ritual de "fechar o dia".

> **Princípio anti-culpa.** O sistema é um espelho para pensar melhor, **nunca** um juiz que
> pune ausências. Métricas e cobranças são sempre enquadradas como conquista/convite, jamais
> como falha — na UX, no tom dos textos e no agente de IA.

Uso pessoal (single-user) por enquanto, mas o banco já nasce multiusuário.

---

## O que já dá para fazer

- **Escrever** devocional, reflexão e anotações num editor rico (TipTap), no celular,
  **inclusive offline** (a captura/escrita entram numa fila e sincronizam ao reconectar).
- **Capturar** ideias em texto puro e depois **revisá-las** — promovendo para nota, recurso
  ou objetivo, ou arquivando com um motivo.
- **Ver a agenda do dia** (diário feito/não + capturas e revisões devidas) e **fechar o dia**
  num ritmo de recapitulação (fiz / não fiz porque… / deixa pra lá).
- **Gerenciar a biblioteca** (livros, cursos, vídeos) e os **objetivos** (hábito, meta,
  projeto, guarda-chuva), com progresso **calculado** a partir dos eventos.
- **Estudar para reter**: formular perguntas antes, escrever de memória sem olhar e comparar,
  e o app devolve o tópico para **revisar em 2 dias → 1 semana → 1 mês**, sempre começando por
  "tente lembrar"; você marca A/B/C e o app destaca o que você sabe menos.
- **Transformar** um estudo num rascunho de post/artigo/aula/vídeo (pipeline de publicações).
- **Usar a IA como assistente opcional** (gerar perguntas, comparar fichamento, montar quiz,
  rascunhar publicação) — no modo cópia/colar (sem custo) ou conectado à API da Anthropic.

---

## Stack

- **Monorepo pnpm** com `packages/shared` (schemas Zod), `ui` (componentes React), `backend`,
  `web` e `mobile`. Web e mobile compartilham `shared/` e `ui/`.
- **Backend:** Node + TypeScript + **Fastify**, **Zod + fastify-type-provider-zod + Swagger**
  (um schema valida, tipa e documenta) e **Prisma + PostgreSQL**. Sem BFF separado.
- **Frontend:** React + **Vite** (PWA, não Next), **Tailwind**, **React Hook Form + Zod**,
  **react-i18next** (pt padrão, en), **TipTap** no editor. **Mobile primeiro.**
- **Datas:** **Luxon** (UTC no banco; "o dia" calculado no timezone do usuário).
- **IA:** **Anthropic SDK** (`@anthropic-ai/sdk`) no modo conectado; templates de prompt puros
  em `shared/` (mesmos templates para o modo cópia/colar e o conectado).
- **Testes:** **Vitest** (TDD estrito no domínio/UseCases).

---

## Começando

### Pré-requisitos

- **Node.js 20+**
- **Docker + Docker Compose** (para o Postgres)
- **pnpm** (`npm i -g pnpm`)

### Instalação

```bash
pnpm install
cp .env.example packages/backend/.env   # ajuste se necessário
```

### Banco de dados

```bash
pnpm db:up            # sobe o Postgres via Docker
pnpm prisma:migrate   # aplica as migrações
pnpm prisma:seed      # cria o usuário fixo "owner"
```

### Rodar em desenvolvimento

```bash
pnpm dev:backend      # Fastify + Swagger em http://localhost:3333/docs
pnpm dev:mobile       # app mobile (Vite PWA) em http://localhost:5174
pnpm dev:web          # shell web em http://localhost:5173
```

---

## IA (opcional)

A IA é **opcional** e respeita os limites do agente (ver `docs/plano-segundo-cerebro.md` §9):
ela **sugere/resume/aponta**, mas **nunca** altera dados sozinha — toda saída é um **candidato**
que você revisa e confirma. Há dois modos, configuráveis em **Configurações → Modo do assistente**:

- **Cópia/colar (padrão, sem custo):** o app monta o prompt e você cola no seu próprio
  ChatGPT/Claude. A IA não toca em dado nenhum, e não precisa de chave.
- **Conectado:** o backend executa o prompt via Anthropic SDK e devolve o texto. A chave fica
  **só no servidor** — defina `ANTHROPIC_API_KEY` em `packages/backend/.env`:

  ```bash
  ANTHROPIC_API_KEY=sk-ant-...
  ```

  Nunca exponha a chave ao frontend; o front só chama `POST /ai/run`.

---

## Comandos úteis

| Comando                               | O que faz                                     |
| ------------------------------------- | --------------------------------------------- |
| `pnpm db:up` / `pnpm db:down`         | Sobe / derruba o Postgres (Docker)            |
| `pnpm prisma:migrate`                 | Aplica migrações do Prisma                    |
| `pnpm prisma:seed`                    | Cria o usuário fixo `owner`                   |
| `pnpm prisma:studio`                  | Abre o Prisma Studio                          |
| `pnpm test`                           | Testes unitários (todos os pacotes)           |
| `pnpm test:integration`               | Testes de integração (precisa do banco de pé) |
| `pnpm lint` / `pnpm lint:fix`         | ESLint                                        |
| `pnpm prettier` / `pnpm prettier:fix` | Prettier                                      |

> Testes do backend isolados: em `packages/backend`, `npm run test` (unit) e
> `npm run test:integration` (Prisma/Postgres real). Mobile: `npm run typecheck`,
> `npm run test`, `npm run build`.

---

## Estrutura do repositório

```
packages/
  shared/    # schemas Zod (fonte única) + templates de prompt de IA
  ui/        # componentes React compartilhados (Button, BottomSheet, …)
  backend/   # Fastify + UseCases + Prisma (DDD-lite: rota → usecase → repo)
  web/       # shell web (Vite PWA)
  mobile/    # app principal (Vite PWA, mobile primeiro)
docs/        # plano, backlog, specs por tarefa, convenções
```

**Arquitetura em camadas (DDD-lite):** a Rota (Fastify) valida com Zod e chama o **UseCase**
(a regra de negócio, que não conhece Fastify nem Prisma); o UseCase depende de **interfaces de
Repository**, com implementação Prisma em produção e um **fake em memória** nos testes.

---

## Documentação

- **`docs/plano-segundo-cerebro.md`** — o plano completo de produto e arquitetura.
- **`docs/BACKLOG.md`** — o roadmap fatiado em tarefas, com o progresso por MVP.
- **`docs/tasks/`** — uma spec por tarefa (objetivo, contrato, testes, definição de pronto).
- **`docs/LEITURA-RETENTIVA.md`** — o design do recurso de estudo + publicação + agente IA.
- **`docs/CONVENCOES-CODIGO.md`** — caminhos e nomes reais do código.

> **Trabalhando com IA neste repositório?** O fluxo de execução assistida por agente (Claude
> Code) está em **[`READMEIA.md`](./READMEIA.md)** e nas regras inegociáveis de
> **`CLAUDE.md`**.
