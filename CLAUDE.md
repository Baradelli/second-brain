# CLAUDE.md — Regras do projeto "Segundo Cérebro"

> Leia este arquivo no início de toda sessão. São as decisões inegociáveis do projeto.
> O plano completo de produto está em `docs/plano-segundo-cerebro.md` — consulte para
> contexto, mas as regras operacionais que você deve seguir estão AQUI.

## O que é o projeto

Um "segundo cérebro" pessoal: capturar ideias sem atrito, revisar num ritual, transformar
o que vale em conhecimento/objetivos, e manter um ritmo diário (devocional + reflexão).
Uso pessoal (single-user) por enquanto, mas o banco já nasce multiusuário.

## Stack (não trocar sem decisão explícita do dono)

- **Monorepo** com `shared/` (schemas Zod), `ui/` (componentes React), `backend/`,
  `web/` e `mobile/`. Web e mobile têm shells próprios mas compartilham `shared/` e `ui/` —
  não duplicar lógica entre eles.
- **Backend:** Node.js + TypeScript + Fastify. **Sem BFF separado** — o Fastify agrega para
  o front via endpoints (ex.: `buildTodayAgenda`).
- **Validação + Docs:** Zod + `fastify-type-provider-zod` + Swagger (um schema valida,
  infere tipos e gera o OpenAPI).
- **ORM/Banco:** Prisma + PostgreSQL (pgvector só no MVP 4).
- **Frontend:** React + **Vite** (PWA), NÃO Next. Editor de escrita: TipTap. Formulários:
  React Hook Form + `@hookform/resolvers/zod`. i18n: react-i18next (pt default, en).
- **Testes:** Vitest.

## Arquitetura — camadas (DDD-lite)

```
Rota/Controller (Fastify) → UseCase → Repository (interface) → Prisma
   valida com Zod           regra      contrato de              impl real
   (borda)                  negócio    persistência     (+ fake em memória nos testes)
```

Regras de camada que você NUNCA viola:

- A **Rota** valida com Zod e chama o UseCase. Não contém regra de negócio.
- O **UseCase** contém a regra. **Não importa Fastify nem Prisma.** Recebe dados já
  validados e tipados; depende só de interfaces de Repository.
- O **Repository** é uma interface. Tem 2 implementações: Prisma (produção) e **fake em
  memória** (testes).
- **Entidades** simples (DDD-lite): sem value objects, agregados ou domain events por ora.

## TDD — como você trabalha (outside-in), SEMPRE

Para cada caso de uso, nesta ordem:

1. Definir o mini-domínio **só da fatia atual** (não modelar o sistema inteiro).
2. Criar a assinatura/contrato do UseCase.
3. **Escrever os testes do UseCase primeiro** (com o Repository fake).
4. Implementar o mínimo para passar.
5. Rodar os testes (red → green).
6. Refatorar (mantendo verde).
7. **Só então** criar controller/rota/tela.

NUNCA escreva implementação de UseCase antes do teste dele.

## Política de testes (profundidade por camada)

- **UseCase/domínio:** TDD estrito, cobertura alta. Rápido, com Repository fake, sem banco.
- **Repository:** um teste de contrato contra o Prisma real. Poucos, mas existem.
- **Rotas:** integração só nos caminhos críticos (criar anotação ponta a ponta; Zod
  rejeitando entrada inválida).
- **UI:** só os fluxos que quebram em silêncio. O dono é o QA do resto.

Meta: **nunca ter medo de refatorar.** Não perseguir 100% de cobertura de UI.

## Convenções

- TypeScript estrito. Sem `any` (use `unknown` + narrowing).
- Schemas Zod ficam em `shared/`; back e front importam de lá. Nunca duplicar schema.
- Datas: o banco guarda UTC. "Que dia é hoje" SEMPRE se calcula no `timezone` do Settings,
  nunca na hora do servidor.
- **Datas com Luxon, nunca `new Date` para lógica de calendário/fuso.** Use Luxon
  (`DateTime`) para qualquer raciocínio sobre dia/semana/mês e timezone. `new Date` só é
  aceitável para instantes triviais. Todo cálculo "instante ↔ dia do calendário" passa pelos
  helpers de data (ex.: `dayRange` em `domain/`), nunca espalhado pelo código — assim trocar
  de lib mexe num arquivo só. Luxon vive principalmente no `backend`.
- Soft delete: tabelas de UI usam `status` + `archivedAt`. **Event é log imutável** (não
  se arquiva).
- Progresso/streak/pendente são **calculados** a partir dos eventos, nunca guardados.
- `Event.type` e `Goal.type` são `String` validados por `z.enum` (ainda evoluem);
  os demais status/tipos são enums Prisma.
- **Idioma: código em inglês, conteúdo em português.** Tabelas, colunas, entidades, enums,
  funções, variáveis e rotas SEMPRE em inglês (`Note`, `Capture`, `Goal`, `Event`,
  `Resource`, `Label`, `GuideQuestion`, `Attachment`, `Settings`, `User`). Português só no
  conteúdo que o usuário vê.
- **i18n no frontend (react-i18next).** Nenhum texto solto nas telas — tudo via `t('chave')`.
  Chaves **semânticas em inglês** (`agenda.todayTitle`). `pt` default, `en` segundo locale.

## O que NÃO fazer agora (fora de escopo até o MVP indicado)

- Nada de IA/agente, OCR, embeddings, WhatsApp (MVP 4–5).
- Nada de Resource/Goal/Event/biblioteca no MVP 1 (isso é MVP 2).
- Nada de resolução de conflito offline (Nível 2). Offline Nível 1 = só fila de
  captura/escrita.
- Não criar telas antes do domínio testado.
- Não tomar decisões "espirituais/devocionais" no lugar do dono em nenhuma feature.

## Fluxo de execução de tarefas

- Pegue UMA tarefa de `docs/tasks/` por vez, na ordem do `docs/BACKLOG.md`.
- Siga o ciclo TDD. Ao terminar, pare e reporte o que foi feito vs o "Definição de pronto"
  da tarefa. Não emende a próxima tarefa sem o dono revisar.
- Se algo no plano estiver ambíguo ou conflitar, PERGUNTE antes de assumir.
