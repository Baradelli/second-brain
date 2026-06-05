# Tarefa 36 — UseCase `buildDayClosing` + rota `GET /day-closing?day=today`

> Abre o **Bloco L — Fechar o dia + integrações**. O ritual de recapitulação (nunca auditoria —
> princípio anti-culpa): listar o que estava **pendente hoje** para o dono resolver como
> **fiz** / **não fiz porque…** / **deixa pra lá**. Aqui só **montamos a lista**; resolver é
> `checkGoal`/`skipGoal` (Bloco K) ou nada ("deixa pra lá" não grava). TDD no UseCase.
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.** Em conflito com esta spec, vale aquele
> arquivo.

## Objetivo

Dado um usuário e um instante de referência, retornar os objetivos **pendentes hoje**, no
timezone do Settings:

- **Agendados (`scheduled`)**: HABIT com cadência `weekdays` cujo dia da semana de hoje está
  na lista **e** que ainda **não foi resolvido hoje** (sem `done` nem `skip` com `occurredAt`
  no dia de hoje).
- **Convites (`invitation`)**: HABIT com cadência `period`+`timesPerPeriod` cujo **período
  corrente ainda está aberto** (`done` no período < `timesPerPeriod`) **e** sem evento hoje.

## Decisões já tomadas (do BACKLOG/HANDOFF — não reabrir)

- "Fechar o dia" é **recapitulação, nunca auditoria** (tom anti-culpa).
- Eventos possíveis: `done` e `skip` (com `reason`). **"Deixa pra lá" não grava nada.**
- Progresso/pendência **calculados**, nunca guardados. "O dia" no timezone do Settings (Luxon).

## Mini-domínio / contrato

`src/usecases/build-day-closing.ts`:

```ts
export interface BuildDayClosingInput {
  userId: string;
  reference: Date; // "agora"; o dia é calculado no timezone do Settings
}

export type DayClosingKind = 'scheduled' | 'invitation';

export interface DayClosingItem {
  goalId: string;
  title: string;
  type: 'HABIT';
  kind: DayClosingKind;
  // para invitation: quanto falta no período (informativo, não cobrança)
  periodTarget?: number; // timesPerPeriod
  periodDone?: number;   // done no período corrente
}

export interface DayClosing {
  date: string; // YYYY-MM-DD (dia local)
  pending: DayClosingItem[];
}

// depende de GoalRepository (find) + EventRepository (find) + SettingsReader
```

## Regras (o que os testes provam)

Timezone via `SettingsReader` (fallback `'America/Sao_Paulo'`); dia/semana/mês via `dayRange`.
Dia da semana de hoje: `DateTime.fromJSDate(reference,{zone}).weekday % 7` (0=domingo..6=sábado,
mesma convenção de `weekdays`).

Buscar HABITs ativos (`GoalRepository.find({ userId, status:'ACTIVE', type:'HABIT' })`). Para cada:

1. **Resolvido hoje?** Há evento (`done` **ou** `skip`) com `occurredAt` na janela do dia
   (`dayRange(reference, tz, 'DAY')`)? Se sim → **não** entra em `pending`.
2. **weekdays**: se hoje ∈ `goal.weekdays` e não resolvido hoje → item `scheduled`.
3. **period**: janela = `dayRange(reference, tz, scope)` (day/week/month). `periodDone` = nº de
   `done` no período; se `periodDone < timesPerPeriod` e não resolvido hoje → item `invitation`
   (com `periodTarget`/`periodDone`).
4. Goals concluídos (`completedAt`) ou arquivados **não** entram (find já filtra ARCHIVED;
   `completedAt` filtrar no UseCase). (Decisão.)
5. Ordenação: `scheduled` antes de `invitation`; dentro de cada, por `title`. (Decisão estável p/ teste.)

## Rota

`GET /day-closing` (em `src/routes/...`), query `{ userId, day: z.enum(['today']).default('today') }`
(mesmo molde de `/agenda`); `200: dayClosingResponseSchema` (em `shared/`). Usa `reference = new Date()`.

## Decisões que assumi (revisar antes de executar)

- **Só HABIT entra no fechar-o-dia.** TARGET/PROJECT (cumulativos) e UMBRELLA não são "do dia".
  Se quiser TARGET com `dueAt` de hoje aparecendo, a gente acrescenta depois.
- **`period` aberto = `done < timesPerPeriod` no período + sem evento hoje.** Assim um hábito
  "3x/semana" deixa de convidar quando você já bateu 3 no período, ou quando já registrou algo
  hoje. Alternativa: convidar todo dia até bater a meta (mais insistente) — não recomendo.
- **Goal concluído não aparece** (coerente com "completar" da Tarefa 31).
- **"Deixa pra lá" não tem efeito no servidor** — é só o dono ignorar o item; nada é gravado.

## Testes a escrever PRIMEIRO (Vitest, fakes)

`src/usecases/__tests__/build-day-closing.test.ts`:

- HABIT weekdays com hoje na lista e sem evento → `scheduled`; com `done` hoje → some;
  com `skip` hoje → some; hoje fora da lista → não aparece.
- HABIT period 3x/semana com 1 done na semana e nada hoje → `invitation` (periodDone=1,target=3);
  com 3 done na semana → some; com evento hoje → some.
- Goal concluído (`completedAt`) → não aparece. Arquivado → não aparece.
- Goal de outro user → não aparece. Ordenação scheduled antes de invitation.

## Arquivos a tocar

- `src/usecases/build-day-closing.ts` + teste.
- `packages/shared/src/day-closing.ts` (schema de resposta) + `index.ts`.
- `src/routes/...` (rota `GET /day-closing`) + `http/server.ts` + teste de rota (1 caminho).
- (Se extrair "dia da semana 0..6" como helper, pôr em `src/domain/`.)
- **Não** tocar: telas, agenda (Tarefa 38), promote (37).

## Fora de escopo

- A tela "fechar o dia" (Tarefa 41). Resolver os itens (já é check/skip do Bloco K).
- Incluir TARGET/PROJECT/UMBRELLA na lista.

## Definição de pronto

- [ ] `buildDayClosing` lista `scheduled` (weekdays de hoje) + `invitation` (período aberto),
      excluindo resolvidos hoje, concluídos e arquivados.
- [ ] Cálculo de dia/semana/mês via `dayRange`/Luxon (nada de `new Date` para calendário).
- [ ] Testes de UseCase escritos **antes**, verdes; rota `GET /day-closing` + schema + 1 teste.
- [ ] `unit` e `integration` verdes.
- [ ] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar e **parar**.
