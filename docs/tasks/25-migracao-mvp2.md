# Tarefa 25 — Migração MVP 2: `Resource`, `Goal`, `Event` (+ FKs em `Note`)

> Primeira tarefa do MVP 2. **Migração pura**: cria as três novas tabelas, os FKs
> opcionais em `Note` e as relações de `Label`. Não há regra de negócio aqui — o domínio
> e os testes de contrato chegam nas tarefas seguintes (26+). Ver `docs/BACKLOG.md`.

## Objetivo

Deixar o banco preparado para todo o MVP 2 numa **única migração**, coerente com as
convenções já em uso no MVP 1 (cuid, soft delete `status` + `archivedAt`, enums Prisma para
valores fechados, `String` + `z.enum` para o que ainda evolui, datas UTC).

Ao final, `prisma migrate` aplica limpo, `prisma generate` tipa as novas entidades, e as
tarefas 26+ têm o terreno pronto.

## Decisões já tomadas (não reabrir nesta tarefa)

- **Desfazer check = hard delete do `Event`** — única exceção documentada ao "Event é log
  imutável". Por isso `Event` **não** tem `status`/`archivedAt`.
- **"Deixa pra lá" grava nada.** Eventos possíveis são só `done` e `skip`. `skip` sempre
  carrega `reason` (regra de aplicação, não constraint de banco).
- **UMBRELLA fecha na mão** (`Goal.completedAt` preenchido manualmente). UMBRELLA não recebe
  check direto — regra de aplicação, validada no UseCase de check (Tarefa 32), não aqui.
- **Cadência de HABIT**: duas formas mutuamente exclusivas — `weekdays` (dias fixos) **ou**
  `period` + `timesPerPeriod` (Nx por período). Exclusividade validada na aplicação.
- **FKs `Note → Goal` e `Note → Resource` entram já agora** (nullable; "o banco nasce
  preparado"). Schema morto por algumas tarefas é aceitável para evitar segunda migração na
  tabela central.

## Contrato (schema a adicionar)

Adicionar ao `schema.prisma` (modelos novos + edições em `Note`, `Label`, `User`):

```prisma
model Resource {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  title       String
  type        String        // "book"|"course"|"video"|"article"|"podcast"|"other" (z.enum)
  url         String?
  author      String?
  description String?
  stage       String        @default("backlog") // "backlog"|"in_progress"|"done" (z.enum)
  status      GeneralStatus @default(ACTIVE)
  archivedAt  DateTime?
  createdAt   DateTime      @default(now())

  labels Label[] @relation("ResourceLabels")
  notes  Note[]
}

model Goal {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  title       String
  description String?
  type        String        // "HABIT"|"TARGET"|"PROJECT"|"UMBRELLA" (z.enum)
  parentId    String?
  parent      Goal?         @relation("GoalTree", fields: [parentId], references: [id])
  children    Goal[]        @relation("GoalTree")
  targetValue Float?        // TARGET/PROJECT
  unit        String?
  period         String?    // "day"|"week"|"month" (z.enum) — cadência "Nx por período"
  timesPerPeriod Int?
  weekdays       Int[]      @default([]) // 0=domingo..6=sábado (mesma convenção de Settings)
  startAt     DateTime?
  dueAt       DateTime?
  completedAt DateTime?     // UMBRELLA: preenchido na mão
  status      GeneralStatus @default(ACTIVE)
  archivedAt  DateTime?
  createdAt   DateTime      @default(now())

  events Event[]
  labels Label[] @relation("GoalLabels")
  notes  Note[]
}

model Event {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  goalId     String
  goal       Goal     @relation(fields: [goalId], references: [id])
  type       String   // "done"|"skip" (z.enum; skip exige reason na aplicação)
  value      Float?   // TARGET/PROJECT: quanto somou neste check
  reason     String?  // obrigatório quando type=skip (regra de aplicação)
  occurredAt DateTime // instante UTC; "o dia" é calculado no timezone do Settings
  createdAt  DateTime @default(now())
  // log imutável: sem status/archivedAt. Hard delete SÓ no desfazer-check (Tarefa 32).
}
```

Edições em modelos existentes:

```prisma
model Note {
  // ... campos atuais ...
  goalId     String?
  goal       Goal?     @relation(fields: [goalId], references: [id])
  resourceId String?
  resource   Resource? @relation(fields: [resourceId], references: [id])
  // ... relations atuais (labels, attachments) ...
}

model Label {
  // ... campos/relations atuais ...
  resources Resource[] @relation("ResourceLabels")
  goals     Goal[]     @relation("GoalLabels")
}

model User {
  // ... relations atuais ...
  resources Resource[]
  goals     Goal[]
  events    Event[]
}
```

## Por que estas escolhas (notas de design)

- **`occurredAt` ≠ `createdAt`** no `Event`: permite registrar à noite algo feito de manhã
  (e o "fechar o dia" registrar o dia que se fecha) sem mentir no log. O cálculo de "que dia
  foi" usa `occurredAt` no timezone do Settings.
- **`stage` ≠ `status`** no `Resource`: `stage` é progresso de consumo (backlog→lendo→fim);
  `status` é o soft delete padrão de UI. Campos separados, responsabilidades separadas.
- **`Event` sem soft delete**: é log imutável por princípio; a única remoção é o hard delete
  do desfazer-check, decidido explicitamente.
- **`type` como `String`+`z.enum`** em Resource/Goal/Event: seguem a convenção de "ainda
  evolui" do CLAUDE.md (migrar para enum Prisma quando estabilizar — item do HANDOFF §7).
- **`weekdays Int[]`**: mesma convenção numérica de `Settings.reviewWeekday` (0=domingo).

## Testes a escrever

Tarefa de migração — **não** há UseCase nem domínio, logo **sem TDD de regra**. Validação:

1. `prisma migrate dev --name mvp2_resource_goal_event` aplica sem erro num banco limpo.
2. `prisma generate` roda e o client tipa `Resource`, `Goal`, `Event` e os novos campos de
   `Note`.
3. **Smoke de contrato mínimo** (um arquivo, não exaustivo — o contrato real vem em 27/30/35):
   criar via `prisma` um `User` → `Goal` → `Event` e ler de volta; criar `Resource` ligado a
   `Label`; criar `Note` com `goalId`. Só garante que as relações e defaults batem com o
   schema. Pode viver em `backend/test/contract/mvp2-schema.contract.test.ts`.

Nenhum teste de UseCase nesta tarefa (não existe UseCase ainda).

## Arquivos a tocar

- `backend/prisma/schema.prisma` — novos modelos + edições em `Note`, `Label`, `User`.
- `backend/prisma/migrations/<timestamp>_mvp2_resource_goal_event/` — gerada pelo Prisma.
- `backend/test/contract/mvp2-schema.contract.test.ts` — smoke de contrato (novo).
- **Não** tocar em `shared/` (schemas Zod das entidades chegam em 26/29/32, com seus testes).

## Fora de escopo (não fazer nesta tarefa)

- Qualquer UseCase, regra de negócio ou validação de aplicação (exclusividade de cadência,
  UMBRELLA sem check, `reason` obrigatório no skip) — vêm nas tarefas seguintes.
- Schemas Zod em `shared/` para as novas entidades.
- Rotas, telas, promoção de captura, agenda, fechar-o-dia.
- Migrar `type` para enum Prisma (só quando estabilizar — HANDOFF §7).
- `recurrence Json?` (só se a recorrência avançada vier um dia; substitui os campos de
  cadência simples, não soma).

## Definição de pronto

- [x] Schema atualizado com `Resource`, `Goal`, `Event` e os FKs/relações em `Note`,
      `Label`, `User`, fiel ao contrato acima.
- [x] Migração criada e aplicada limpa em banco vazio; `prisma generate` tipa tudo.
      (`20260604230926_mvp2_resource_goal_event`)
- [x] Smoke de contrato passa (cria/lê as novas entidades e relações).
      (`src/repositories/__tests__/mvp2-schema.contract.integration.test.ts`, 4 testes)
- [x] `Event` sem `status`/`archivedAt` (log imutável); `Resource` com `stage` E `status`
      separados; `Goal` com os três caminhos de cadência presentes (`weekdays`, `period`,
      `timesPerPeriod`) e `completedAt` nullable.
- [x] Nada de UseCase/Zod/rota/tela adicionado (respeita o fatiamento).
- [x] Reportar o que foi feito vs esta definição e **parar** (não emendar a Tarefa 26).
