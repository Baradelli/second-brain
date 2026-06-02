# Tarefa 06 — Regra "um devocional / uma reflexão por dia" (na aplicação)

## Objetivo

Garantir que exista no máximo **uma** Note de diário por (tipo + escopo + período): um
devocional por dia, uma reflexão por dia, um super-devocional por semana, etc. A regra é
imposta na **aplicação** (não por constraint de banco — senão eu não poderia ter dois
fichamentos no mesmo dia).

## Camada(s)

UseCase (regra de negócio). Usa `findNoteOfTheDay` (Tarefa 05) e `createNote` (Tarefa 01).

## Pré-requisitos

- Tarefas 01–05 + 05b concluídas (`findNoteOfTheDay`, `dayRange` com Luxon).
- `Settings.timezone` disponível.

## Convenção de idioma

Código/identificadores em **inglês**.

## Quais tipos são "diário" (têm unicidade)

- `DEVOTIONAL` e `REFLECTION` → únicos por período (DAY por padrão; WEEK/MONTH/YEAR nas
  recapitulações, Tarefa 07).
- `STUDY_NOTE` e `NOTE` → **sem** unicidade (posso ter vários no mesmo dia).

## Contrato — `upsertJournalNote`

Um UseCase que cria a nota do período se não existir, ou retorna/atualiza a existente.

```ts
interface UpsertJournalNoteInput {
  userId: string;
  type: 'DEVOTIONAL' | 'REFLECTION'; // só tipos de diário
  scope?: NoteScope; // default DAY
  reference: Date; // "agora"
  timezone: string; // de Settings
  title?: string;
  doc: unknown;
  mode?: 'create-or-get' | 'create-or-update'; // default 'create-or-get'
}

class UpsertJournalNote {
  constructor(
    private findNoteOfTheDay: FindNoteOfTheDay,
    private createNote: CreateNote,
    private editNote: EditNote,
  ) {}
  async execute(input: UpsertJournalNoteInput): Promise<{ note: Note; created: boolean }>;
}
```

Regras:

- Buscar a nota do período via `findNoteOfTheDay` (mesmo `type`/`scope`/`timezone`).
- Se **não existe** → `createNote` com `date` = início do período local (use o `from` do
  `dayRange`, para a unicidade ser estável). Retorna `{ note, created: true }`.
- Se **já existe**:
  - `mode: 'create-or-get'` → retorna a existente sem alterar (`created: false`).
  - `mode: 'create-or-update'` → aplica `editNote` (atualiza doc/title) e retorna
    (`created: false`).
- Recusar `type` que não seja de diário (erro claro) — STUDY_NOTE/NOTE não passam por aqui.

## "Já fiz hoje?"

Expor um helper/derivação simples (pode ser o próprio `findNoteOfTheDay` retornando não-nulo)
para a agenda responder se o devocional/reflexão do dia já foi feito. Não precisa de campo
novo — é calculado.

## Testes a escrever PRIMEIRO (unit, com fakes)

1. Primeiro devocional do dia → cria, `created: true`, `date` = início do dia local.
2. Segundo devocional do mesmo dia, `create-or-get` → retorna o existente, `created: false`,
   não cria duplicata.
3. Segundo devocional do mesmo dia, `create-or-update` → atualiza o existente (doc novo),
   ainda um só.
4. Devocional e reflexão no mesmo dia coexistem (unicidade é por tipo).
5. Dois dias diferentes → duas notas (borda de dia no fuso correto, UTC-3).
6. `type: STUDY_NOTE` → erro (não é diário; deve usar `createNote` normal).
7. Em outro `scope` (ex.: WEEK) a unicidade é por semana (prepara a Tarefa 07).

## Arquivos a tocar

- `packages/backend/src/usecases/upsert-journal-note.ts` (+ teste).
- `packages/backend/src/domain/errors.ts` (ex.: `NotAJournalTypeError`), se necessário.
- (Opcional) rota `POST /journal` que recebe type/doc e chama este UseCase — pode ficar
  para uma tarefa de rotas, mas se fizer, validar com Zod em `shared`.

## Fora de escopo

- NÃO impor unicidade via constraint no Prisma.
- NÃO tratar STUDY_NOTE/NOTE aqui.
- NÃO construir a tela do diário (Bloco G).

## Definição de pronto

- [x] `upsertJournalNote` cria-ou-obtém / cria-ou-atualiza conforme `mode`.
- [x] `date` da nota normalizada para o início do período local (unicidade estável).
- [x] Unicidade por (type + scope + período) garantida na aplicação; tipos não-diário recusados.
- [x] 7 testes passando (`pnpm test`), incluindo borda de dia em UTC-3 e scope WEEK.
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
