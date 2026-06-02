# Segundo Cérebro — Pacote de início

Este conjunto de arquivos leva o projeto do plano conceitual ao código, de forma que o
**Claude Code** execute sem se perder e você sempre saiba o que esperar.

## Os arquivos e a ordem de uso

1. **`CLAUDE.md`** (raiz) — regras permanentes. O Claude Code lê em toda sessão. Não
   precisa fazer nada além de mantê-lo na raiz do repositório.
2. **`docs/plano-segundo-cerebro.md`** — o plano completo de produto/arquitetura (a fonte
   conceitual). Contexto, não instrução operacional.
3. **`docs/SETUP.md`** — rode isto primeiro, uma vez. Deixa o monorepo, Postgres, Prisma e
   Vitest de pé.
4. **`docs/WORKFLOW.md`** — como cada tarefa é executada e revisada (uma de cada vez).
5. **`docs/BACKLOG.md`** — o MVP 1 fatiado em 24 tarefas ordenadas. Seu mapa de progresso.
6. **`docs/tasks/`** — uma spec por tarefa. As Tarefas 01 e 02 já estão detalhadas; as
   demais se detalham sob demanda (peça quando chegar perto).

## Como começar (resumo)

1. Crie o repositório e coloque estes arquivos nele (CLAUDE.md na raiz, o resto em docs/).
2. Siga o `docs/SETUP.md` até o checklist final passar.
3. Abra o Claude Code e diga: **"Leia o CLAUDE.md e faça a Tarefa 01
   (docs/tasks/01-usecase-criar-anotacao.md)."**
4. Revise o resultado contra a "Definição de pronto" da tarefa. Aprove.
5. Atualize o status no `BACKLOG.md` e parta para a Tarefa 02. Uma de cada vez.

## O princípio por trás da granularidade

Arquivos de regra curtos e estáveis (`CLAUDE.md`) + uma spec pequena por fatia. Isso evita
que o agente se perca em contexto longo e mantém seus diffs pequenos o bastante para revisar
de verdade. O domínio nasce testado (TDD estrito); as bordas, no essencial.
