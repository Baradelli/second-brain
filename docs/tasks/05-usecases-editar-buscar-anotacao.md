# Tarefa 05 — UseCases `editNote` + `findNoteOfTheDay`

## Objetivo

Permitir editar uma nota existente e buscar "a nota do dia" de um dado tipo (ex.: o
devocional de hoje), respeitando o fuso horário do usuário. É a base para a regra do
diário (Tarefa 06).

## Camada(s)

UseCase (+ um util de domínio para limites do dia). Usa o `NoteRepository` (fake nos testes).

## Pré-requisitos

- Tarefas 01–04 concluídas.
- `NoteRepository` com `byId`, `find`, `update` (já existe).
- `Settings.timezone` disponível (veio no schema/seed).

## Convenção de idioma

Código/identificadores em **inglês**.

## Parte 1 — `editNote`

```ts
interface EditNoteInput {
  id: string;
  title?: string;
  doc?: unknown; // se vier, re-derivar plainText
  labelIds?: string[];
}

class EditNote {
  constructor(private repo: NoteRepository) {}
  async execute(input: EditNoteInput): Promise<Note> {
    /* ... */
  }
}
```

Regras:

- Se `doc` for enviado, **re-derivar `plainText`** com o mesmo `docToText` da Tarefa 01
  (não duplicar a lógica — reutilizar).
- Campos não enviados permanecem (patch parcial via `repo.update`).
- Nota inexistente → erro claro (ex.: `NoteNotFoundError`).

## Parte 2 — `findNoteOfTheDay`

```ts
interface FindNoteOfTheDayInput {
  userId: string;
  type: NoteType; // ex.: DEVOTIONAL
  scope?: NoteScope; // default DAY
  reference: Date; // "agora" (instante); o dia é derivado disto + timezone
  timezone: string; // ex.: "America/Sao_Paulo" (vem de Settings)
}

class FindNoteOfTheDay {
  constructor(private repo: NoteRepository) {}
  async execute(input: FindNoteOfTheDayInput): Promise<Note | null> {
    /* ... */
  }
}
```

Regras (atenção — é o ponto sensível):

- Calcular o **início e fim do dia local** no `timezone` informado, e converter para UTC
  para consultar (`repo.find({ userId, type, scope, from, to, status: 'ACTIVE' })`).
- O banco guarda UTC; o "dia" é sempre o dia LOCAL do usuário. NUNCA usar a hora do servidor.
- Retornar a nota se existir, senão `null` (não é erro — só ainda não foi escrita hoje).
- Se houver mais de uma (não deveria, mas a unicidade só é imposta na Tarefa 06), retornar
  a mais recente e seguir — a Tarefa 06 trata a unicidade.

## Util de domínio

- Criar `packages/backend/src/domain/day-range.ts`: `dayRange(reference, timezone, scope)`
  → `{ from: Date, to: Date }` em UTC. Função pura, testável isoladamente.
- Para o cálculo com timezone, usar a lib de datas que o projeto adotar (ex.: as APIs de
  `Intl`/`Temporal` ou uma lib como `date-fns-tz`/`luxon`). Escolher uma e manter.

## Testes a escrever PRIMEIRO (unit, com fake repo)

`editNote`:

1. Editar `title` mantém o resto.
2. Editar `doc` re-deriva `plainText`.
3. Nota inexistente → erro.

`dayRange` (util puro): 4. Para um timezone negativo (ex.: America/Sao_Paulo, UTC-3), uma nota criada às 22h local
cai DENTRO do dia local correto (e não no dia seguinte UTC). 5. `scope: WEEK` retorna o intervalo da semana local.

`findNoteOfTheDay`: 6. Acha o devocional de hoje quando existe. 7. Retorna `null` quando não há nota hoje. 8. Não retorna a nota de ontem (borda do dia no fuso correto).

## Arquivos a tocar

- `packages/backend/src/usecases/edit-note.ts` (+ teste).
- `packages/backend/src/usecases/find-note-of-the-day.ts` (+ teste).
- `packages/backend/src/domain/day-range.ts` (+ teste).
- Erros: `packages/backend/src/domain/errors.ts` (ex.: `NoteNotFoundError`), se ainda não existir.

## Fora de escopo

- NÃO impor "um por dia" ainda (Tarefa 06 faz isso, usando `findNoteOfTheDay`).
- NÃO criar rotas para esses UseCases ainda (pode entrar junto da 06 ou depois).
- NÃO tratar recapitulação WEEK/MONTH/ANO como feature (Tarefa 07) — só o `dayRange`
  precisa suportar o cálculo de intervalo por escopo.

## Definição de pronto

- [x] `editNote` re-deriva `plainText` quando `doc` muda; patch parcial funciona.
- [x] `dayRange` puro e testado, correto para timezone UTC-3 nas bordas (fix: getUTCDay() evita bug com timezone do servidor).
- [x] `findNoteOfTheDay` usa `dayRange` + `repo.find`; retorna nota ou `null`.
- [x] 12 testes passando (3 editNote + 5 dayRange + 4 findNoteOfTheDay).
- [x] Nenhum cálculo de "hoje" usa a hora do servidor — sempre o timezone do usuário.
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
