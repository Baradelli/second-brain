# Tarefa 07 — Recapitulação: Note de escopo WEEK / MONTH / YEAR

## Objetivo

Permitir criar/obter o "super devocional" e a "super reflexão" (e recapitulações de mês/ano):
notas de diário com `scope` WEEK, MONTH ou YEAR. Reusa toda a máquina da Tarefa 06 — muda
só o escopo e a normalização do período.

## Camada(s)

UseCase (fino, por cima do `upsertJournalNote`) + ajuste no util de período se necessário.

## Pré-requisitos

- Tarefas 05/05b (dayRange com Luxon, suportando WEEK/MONTH/YEAR) e 06 (upsertJournalNote).

## Convenção de idioma

Código/identificadores em **inglês**.

## Ideia central

Recapitulação **não é um tipo novo** — é o mesmo `DEVOTIONAL`/`REFLECTION` com `scope`
diferente. A unicidade da Tarefa 06 já é por (type + scope + período), então o "super
devocional da semana" é único por semana automaticamente. Esta tarefa é principalmente:

1. garantir que `dayRange` normaliza corretamente o início do período para WEEK/MONTH/YEAR;
2. expor um UseCase claro para a UI de recapitulação.

## Contrato — `upsertRecap`

```ts
interface UpsertRecapInput {
  userId: string;
  type: 'DEVOTIONAL' | 'REFLECTION';
  scope: 'WEEK' | 'MONTH' | 'YEAR'; // DAY não é recap
  reference: Date;
  timezone: string;
  recapWeekday?: number; // de Settings (início da semana), p/ scope WEEK
  title?: string;
  doc: unknown;
  mode?: 'create-or-get' | 'create-or-update';
}

class UpsertRecap {
  constructor(private upsertJournalNote: UpsertJournalNote) {}
  async execute(input: UpsertRecapInput): Promise<{ note: Note; created: boolean }>;
}
```

Regras:

- Validar que `scope` ∈ {WEEK, MONTH, YEAR} (DAY → erro: use o fluxo de diário normal).
- Para WEEK, respeitar `recapWeekday` de Settings ao calcular o início da semana (a semana
  do usuário pode começar no domingo). Garantir que `dayRange('WEEK')` honra isso — ajustar
  o helper se hoje ele assume um início fixo.
- Delegar o create-or-get/update ao `upsertJournalNote` (não duplicar lógica).
- `date` normalizada para o início do período local (início da semana/mês/ano).

## Testes a escrever PRIMEIRO (unit, com fakes)

1. Super reflexão da semana → cria com `date` = início da semana local (conforme `recapWeekday`).
2. Segunda chamada na mesma semana, `create-or-get` → retorna a existente (não duplica).
3. Recap de MONTH usa o dia 1 do mês local como `date`.
4. Recap de YEAR usa 1º de janeiro local.
5. Duas semanas diferentes → duas notas.
6. `scope: DAY` → erro (não é recap).
7. `recapWeekday` diferente (ex.: semana começando segunda) muda o início da semana corretamente.

## Arquivos a tocar

- `packages/backend/src/usecases/upsert-recap.ts` (+ teste).
- `packages/backend/src/domain/day-range.ts` — se precisar suportar `weekStartsOn`/`recapWeekday`.
- `packages/backend/src/domain/errors.ts` — erro de escopo inválido, se necessário.

## Fora de escopo

- NÃO gerar conteúdo/resumo automático da semana (isso é o agente, MVP 5).
- NÃO calcular métricas do período (MVP 3) — aqui é só a nota de recapitulação em si.
- NÃO construir a tela (Bloco G).

## Definição de pronto

- [x] `upsertRecap` cria/obtém recapitulações WEEK/MONTH/YEAR reusando `upsertJournalNote`.
- [x] `dayRange` honra `weekStartsOn` (mapeado de `recapWeekday`) para o início da semana.
- [x] `date` normalizada para o início do período (semana/mês/ano) local.
- [x] 7 testes passando, incluindo borda de semana com início no domingo.
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
