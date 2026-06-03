# SETUP.md — Setup inicial (rode uma vez)

> O esqueleto do monorepo já vem pronto neste repositório. Este guia é só para
> **instalar dependências, subir o banco e validar** que tudo roda. Quando o checklist do
> final passar, abra `docs/BACKLOG.md` e comece a Tarefa 01.

## 0. Pré-requisitos

- Node.js 20+.
- Docker + Docker Compose.
- pnpm: `npm i -g pnpm`.

## 1. O que já vem pronto

- Monorepo pnpm com `packages/shared`, `ui`, `backend`, `web`, `mobile`.
- TypeScript estrito (`tsconfig.base.json`), ESLint, Prettier.
- `docker-compose.yml` com Postgres.
- Backend Fastify base com Zod type provider + Swagger em `/docs` (sem rotas de negócio
  ainda — entram na Tarefa 04).
- Prisma com o schema do **MVP 1** (User, Settings, Capture, Note, Label, Attachment,
  GuideQuestion) + seed de 1 usuário fixo.
- `shared` já com `createNoteSchema` (usado pela Tarefa 01) e validação de `HH:mm`.
- `web` e `mobile` como apps Vite + PWA (placeholder), `ui` para componentes compartilhados.

## 2. Instalar

```bash
pnpm install
cp .env.example packages/backend/.env   # ajuste se necessário
```

## 3. Subir o banco e migrar

```bash
pnpm db:up              # sobe o Postgres via Docker
pnpm prisma:migrate     # cria as tabelas do MVP 1 (nome sugerido: init_mvp1)
pnpm prisma:seed        # cria o usuário fixo "owner"
```

## 4. Validar

```bash
pnpm test               # roda os testes unit (ainda vazios — só valida a config)
pnpm dev:backend        # sobe o Fastify; abra http://localhost:3333/docs
pnpm dev:web            # abre o web em http://localhost:5173
pnpm dev:mobile         # abre o mobile em http://localhost:5174
```

## 5. Notas

- `Resource`, `Goal`, `Event`, `Embedding` **não** estão no schema ainda — entram nas
  fases seguintes (ver `docs/BACKLOG.md`), para evitar migrações grandes e mortas.
- Datas em UTC; "o dia" se calcula no `timezone` de Settings (regra no `CLAUDE.md`).

## Definição de pronto do setup

- [ ] `pnpm install` sem erros.
- [ ] `pnpm db:up` sobe o Postgres.
- [ ] `pnpm prisma:migrate` cria as tabelas do MVP 1.
- [ ] `pnpm prisma:seed` cria o usuário "owner".
- [ ] `pnpm dev:backend` mostra o Swagger em `/docs`.
- [ ] `pnpm test` roda sem erro de config.

Quando tudo acima estiver ok, abra `docs/BACKLOG.md` e diga ao Claude Code:
**"Leia o CLAUDE.md e faça a Tarefa 01 (docs/tasks/01-usecase-criar-anotacao.md)."**
