# Tarefa 58 — Migração Leitura Retentiva: `StudyItem` + `Recall`

> Primeira tarefa do **Bloco N** (`docs/BACKLOG.md` → seção "Leitura Retentiva"; design em
> `docs/LEITURA-RETENTIVA.md`). **Migração pura**: cria as duas novas tabelas, o enum de status, os
> FKs opcionais e as relações de `Resource`/`Note`/`Label`/`User`. Não há regra de negócio aqui — o
> domínio e os UseCases chegam nas tarefas 59/60; o Prisma repo + contrato na 61.
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.** Em conflito com esta spec, vale aquele arquivo.

## Objetivo

Deixar o banco preparado para todo o motor de revisão numa **única migração**, coerente com as
convenções já em uso (cuid, soft delete `status` + `archivedAt` para o que é durável, **log
imutável sem status** para o que é evento, enums Prisma para valores fechados, `String`/`Json` para
o que ainda evolui, datas UTC).

Ao final, `prisma migrate` aplica limpo, `prisma generate` tipa as novas entidades, e as tarefas
59/60/61 têm o terreno pronto.

## Decisões já tomadas (não reabrir nesta tarefa)

- **`Recall` é log imutável** (espelha `Event`): **sem** `status`/`archivedAt`. A única remoção é o
  **hard delete** do desfazer-recall (regra de aplicação, Tarefa 60), não constraint de banco.
- **`StudyItem` é durável**: soft delete padrão (`status` + `archivedAt`), mais o estado
  `CONSOLIDATED` (terminou a escada de revisões). `status` é **enum Prisma** (valores fechados).
- **Agendamento NÃO tem coluna.** `nextRecallAt`/consolidado são **calculados** dos `Recall`
  (Tarefa 60). Não criar campos de schedule na tabela.
- **`questions` é `Json?`** (`{ before, during, after }`) — formato ainda evolui; não vira tabela.
- **FKs nullable já agora** ("o banco nasce preparado"): `StudyItem.resourceId`,
  `StudyItem.fichamentoNoteId` (→ `Note`), `Recall.studyItemId`. Schema "morto" por algumas tarefas
  é aceitável para evitar segunda migração.
- **`confidence` como `String` + `z.enum`** (`'A'|'B'|'C'`) — segue a convenção "ainda evolui" do
  CLAUDE.md; vira enum Prisma quando estabilizar.

## Contrato (schema a adicionar)

Adicionar ao `schema.prisma` (modelos novos + enum + edições em `Resource`, `Note`, `Label`, `User`):

```prisma
enum StudyItemStatus {
  ACTIVE
  ARCHIVED
  CONSOLIDATED
}

model StudyItem {
  id               String          @id @default(cuid())
  userId           String
  user             User            @relation(fields: [userId], references: [id])
  resourceId       String?
  resource         Resource?       @relation(fields: [resourceId], references: [id])
  title            String
  reference        String?         // ex.: "pp. 40–60"
  questions        Json?           // { before: string[]; during: string[]; after: string[] }
  fichamentoNoteId String?         // Note STUDY_NOTE escrita de memória (Práticas 1/6)
  fichamentoNote   Note?           @relation("StudyItemFichamento", fields: [fichamentoNoteId], references: [id])
  status           StudyItemStatus @default(ACTIVE)
  archivedAt       DateTime?
  createdAt        DateTime        @default(now())  // = dia do fichamento ("mesmo dia" da escada)

  recalls Recall[]
  labels  Label[]  @relation("StudyItemLabels")
}

model Recall {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  studyItemId String
  studyItem   StudyItem @relation(fields: [studyItemId], references: [id])
  confidence  String    // "A"|"B"|"C" (z.enum) — A=sei explicar, B=reconheço, C=não sei
  note        String?   // observação curta opcional
  occurredAt  DateTime  // instante UTC; "o dia" é calculado no timezone do Settings
  createdAt   DateTime  @default(now())
  // log imutável: sem status/archivedAt. Hard delete SÓ no desfazer-recall (Tarefa 60).
}
```

Edições em modelos existentes:

```prisma
model Resource {
  // ... campos/relations atuais ...
  studyItems StudyItem[]
}

model Note {
  // ... campos/relations atuais ...
  studyItems StudyItem[] @relation("StudyItemFichamento")
}

model Label {
  // ... campos/relations atuais ...
  studyItems StudyItem[] @relation("StudyItemLabels")
}

model User {
  // ... relations atuais ...
  studyItems StudyItem[]
  recalls    Recall[]
}
```

## Por que estas escolhas (notas de design)

- **`createdAt` = dia do fichamento.** A escada (Tarefa 60) usa `createdAt` como base quando ainda
  não há `Recall`: o fichamento de memória **é** o "mesmo dia" da Prática 3.
- **`Recall` sem soft delete**: log imutável por princípio, igual a `Event`. A única exceção é o
  hard delete do desfazer, decidido explicitamente.
- **`StudyItemStatus` como enum Prisma** (não `String`): os três estados são fechados e estáveis
  (ACTIVE/ARCHIVED/CONSOLIDATED), diferente de `confidence`/`type` que ainda evoluem.
- **Sem coluna de agendamento**: respeita "progresso/pendência são calculados, nunca guardados".
- **`fichamentoNote` é `Note` STUDY_NOTE**: reusa o editor TipTap e a busca; não duplicamos conteúdo.

## Testes a escrever

Tarefa de migração — **não** há UseCase nem domínio, logo **sem TDD de regra**. Validação:

1. `prisma migrate dev --name leitura_retentiva_studyitem_recall` aplica sem erro em banco limpo.
2. `prisma generate` roda e o client tipa `StudyItem`, `Recall`, `StudyItemStatus` e as novas
   relações de `Resource`/`Note`/`Label`/`User`.
3. **Smoke de contrato mínimo** (um arquivo, não exaustivo — o contrato real vem na 61): criar via
   `prisma` um `User` → `StudyItem` (ligado a um `Resource` e a um `Label`) → `Recall`, e ler de
   volta; criar um `StudyItem` com `fichamentoNoteId` apontando para uma `Note`. Só garante que
   relações e defaults batem com o schema. Pode viver em
   `src/repositories/__tests__/leitura-retentiva-schema.contract.integration.test.ts`.

Nenhum teste de UseCase nesta tarefa (não existe UseCase ainda).

## Arquivos a tocar

- `packages/backend/prisma/schema.prisma` — enum + novos modelos + edições em `Resource`, `Note`,
  `Label`, `User`.
- `packages/backend/prisma/migrations/<timestamp>_leitura_retentiva_studyitem_recall/` — gerada pelo Prisma.
- `packages/backend/src/repositories/__tests__/leitura-retentiva-schema.contract.integration.test.ts` — smoke (novo).
- **Não** tocar em `shared/` (schemas Zod chegam na 59/61, com seus testes).

## Fora de escopo (não fazer nesta tarefa)

- Qualquer UseCase, domínio ou validação de aplicação (título não-vazio, `confidence` ∈ A/B/C,
  escada de agendamento, hard delete) — vêm nas tarefas 59/60.
- Schemas Zod em `shared/`, Prisma repository + contrato (Tarefa 61).
- Rotas, telas, agenda, publicação, IA.
- Migrar `confidence` para enum Prisma (só quando estabilizar).

## Definição de pronto

- [x] Schema atualizado com `StudyItem`, `Recall`, `StudyItemStatus` e os FKs/relações em
      `Resource`, `Note`, `Label`, `User`, fiel ao contrato acima.
- [x] Migração criada e aplicada limpa; `prisma generate` tipa tudo.
      (`20260627151117_leitura_retentiva_studyitem_recall`)
- [x] Smoke de contrato passa (cria/lê `StudyItem`/`Recall` com `Resource`/`Label`/`Note`).
      (`src/repositories/__tests__/leitura-retentiva-schema.contract.integration.test.ts`, 2 testes)
- [x] `Recall` **sem** `status`/`archivedAt` (log imutável); `StudyItem` com `status` enum
      (ACTIVE/ARCHIVED/CONSOLIDATED) e **sem** coluna de agendamento.
- [x] Nada de UseCase/Zod/rota/tela adicionado (respeita o fatiamento).
- [x] Reportar o que foi feito vs esta definição e **parar** (não emendar a Tarefa 59).
