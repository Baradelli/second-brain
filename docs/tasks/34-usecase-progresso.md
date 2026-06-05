# Tarefa 34 — UseCase `computeGoalProgress` (puro, leitura — **TDD pesado**)

> O coração calculado do MVP 2. **Progresso é SEMPRE derivado dos eventos, nunca guardado.**
> Função de leitura, pura (dados os eventos), com **cobertura alta** — é aqui que erro de
> cálculo machuca. Reaproveita `dayRange` (já existe) e `SettingsReader` para "o dia/semana/mês"
> no timezone do usuário. Ver `CLAUDE.md` (datas via Luxon/helpers, nunca espalhadas).
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.** Em conflito com esta spec, vale aquele
> arquivo.

## Objetivo

Dado um goal, calcular seu progresso a partir dos `Event`s, com a regra certa por tipo:

- **HABIT**: conta eventos `done` no **período corrente** vs a cadência esperada.
- **TARGET/PROJECT**: soma `value` dos `done` (cumulativo) vs `targetValue`.
- **UMBRELLA**: agrega o progresso dos **filhos ativos**.

## Decisões já tomadas (do BACKLOG/HANDOFF — não reabrir)

- Progresso/streak/pendente **calculados**, nunca guardados.
- "O dia/semana/mês" é calculado no `timezone` do Settings, via helpers (não `new Date`).
- UMBRELLA agrega filhos; não tem progresso próprio de eventos (não recebe check).

## Estende o repository (find) — mínimo para esta fatia

Acrescentar `find` ao `EventRepository` (interface + fake), no molde dos outros repos:

```ts
find(filter: EventFilter): Promise<Event[]>;
// EventFilter já declarado na 32: { userId, goalId?, goalIds?, type?, from?, to? }
```

- **Fake**: filtra por `userId`; `goalId` (igualdade) **ou** `goalIds` (inclusão); `type`;
  janela `from`/`to` em `occurredAt` (ambos inclusivos, como o note-fake faz com datas).
- (A impl Prisma do `find` é a Tarefa 35.)

## Contrato do UseCase

`src/usecases/compute-goal-progress.ts`:

```ts
export interface ComputeGoalProgressInput {
  goalId: string;
  userId: string; // dono; senão GoalNotFoundError
  reference?: Date; // "agora" para definir o período corrente (default: now)
}

export interface GoalProgress {
  goalId: string;
  type: GoalType;
  done: number; // HABIT: nº de dias/ocorrências no período; TARGET/PROJECT: soma de value
  target: number | null; // HABIT: cadência esperada no período; TARGET/PROJECT: targetValue; UMBRELLA: nº de filhos ativos
  ratio: number | null; // done/target, **clampado [0,1]**; null quando target é null/0
  period: { from: Date; to: Date } | null; // HABIT: janela; TARGET/PROJECT/UMBRELLA: null
  completed: boolean; // goal.completedAt != null OU ratio>=1 (ver decisão)
  children?: GoalProgress[]; // só UMBRELLA: progresso de cada filho ativo
}

// depende de GoalRepository (byId + find p/ filhos) + EventRepository (find) + SettingsReader
```

## Regras de cálculo (o que os testes provam)

Carregar o goal (`GoalRepository.byId`); inexistente/de outro user → `GoalNotFoundError`.
Obter `timezone` via `SettingsReader.getByUserId` (default `'America/Sao_Paulo'` se ausente,
como o capture-routes já faz).

### HABIT

- **Cadência `weekdays`**: período = semana corrente (`dayRange(reference, tz, 'WEEK')`).
  `target = weekdays.length`. `done = nº de dias distintos` (no tz) com ao menos 1 evento
  `done` na janela. (Contar **dias distintos**, não eventos, p/ não inflar com 2 checks no
  mesmo dia.)
- **Cadência `period`+`timesPerPeriod`**: período = `dayRange(reference, tz, scope)` onde
  `scope` mapeia `day→DAY|week→WEEK|month→MONTH`. `target = timesPerPeriod`.
  `done = nº de eventos done` na janela (aqui múltiplos no mesmo dia contam — é "Nx por período").
- `ratio = clamp(done / target, 0, 1)`.

### TARGET / PROJECT

- Sem janela (`period=null`). `done = soma de value` de **todos** os eventos `done` do goal
  (`value ?? 0`). `target = goal.targetValue` (pode ser null → `ratio=null`).
- `ratio = target ? clamp(done/target, 0, 1) : null`.

### UMBRELLA

- `done`/somatório próprio não se aplica. Buscar **filhos ativos**
  (`GoalRepository.find({ userId, parentId: goalId, status:'ACTIVE' })`), calcular o progresso
  de cada um (recursão de 1 nível — UMBRELLA não aninha) e:
  - `target = nº de filhos ativos`; `done = nº de filhos "completos"` (ver `completed`);
  - `ratio = target>0 ? done/target : null`;
  - `children = [progress de cada filho]`.

### `completed`

- Para HABIT/TARGET/PROJECT: `completed = goal.completedAt != null || (ratio != null && ratio >= 1)`.
- Para UMBRELLA: `completed = goal.completedAt != null` (UMBRELLA fecha na mão; não "completa"
  sozinha pelos filhos). (Decisão.)

## Decisões que assumi (revisar antes de executar)

- **HABIT `weekdays` conta DIAS DISTINTOS**; `period` conta EVENTOS. (Coerente com o significado
  de cada cadência.) Se quiser ambos contando dias distintos, ajusto.
- **TARGET/PROJECT é cumulativo "desde sempre"** (não por período). Faz sentido p/ "ler 100
  páginas". Se um TARGET tiver janela temporal (via `dueAt`), não filtro por isso aqui.
- **UMBRELLA: `done` = filhos completos / `target` = filhos ativos.** Alternativa seria média
  das `ratio` dos filhos (progresso "parcial" agregado). Escolhi contagem de completos por ser
  mais simples de explicar; me diga se prefere a média.
- **`ratio` clampado em [0,1]** (passar do alvo mostra 100%, não 130%). Se quiser deixar passar
  de 100% (para mostrar superação), removo o clamp no topo.
- **`reference` default = `new Date()`** apenas como instante trivial; todo raciocínio de
  calendário passa por `dayRange` (Luxon), conforme CLAUDE.md.

## Testes a escrever PRIMEIRO (Vitest, fakes) — cobertura alta

`src/usecases/__tests__/compute-goal-progress.test.ts`:

- **HABIT weekdays**: 3 dias agendados, 2 com `done` na semana → `done=2,target=3,ratio≈0.667`;
  2 checks no mesmo dia contam 1; evento fora da janela (semana passada) não conta.
- **HABIT period**: `week`/`timesPerPeriod=3`, 4 dones na semana → `done=4` mas `ratio` clampa 1.
- **TARGET**: 3 dones de value 10/20/30, target 100 → `done=60,ratio=0.6`; target null → `ratio=null`.
- **PROJECT**: análogo ao TARGET.
- **UMBRELLA**: 2 filhos ativos, 1 completo → `done=1,target=2,ratio=0.5`, `children.length=2`;
  filho arquivado é ignorado.
- **completed**: goal com `completedAt` → `completed=true` mesmo com `ratio<1`.
- **borda**: goal inexistente/outro user → `GoalNotFoundError`; goal sem eventos → `done=0`.
- Timezone: um evento perto da meia-noite cai no dia certo conforme o `timezone` do Settings.

## Arquivos a tocar

- `src/usecases/ports/event-repository.ts` (+`find`) · `_fakes/event-repository-fake.ts` (+`find`).
- `src/usecases/compute-goal-progress.ts` + teste.
- (Se precisar de um helper de "dias distintos no tz", colocar em `src/domain/` — não espalhar.)
- **Não** tocar: Prisma, rotas, telas, `shared/`.

## Fora de escopo

- Impl Prisma do `find` + contrato (Tarefa 35). Rotas (35).
- Streaks/aderência/comparação período-a-período (MVP 3).
- Agenda/fechar-o-dia (36/38) — consomem este UseCase, mas não fazem parte daqui.

## Definição de pronto

- [x] `EventRepository.find` no fake (janela `occurredAt` inclusiva, `goalId`/`goalIds`/`type`).
- [x] `computeGoalProgress` puro, cobrindo HABIT (as 2 cadências), TARGET/PROJECT e UMBRELLA,
      com `ratio` clampado e `completed` correto.
- [x] **TDD pesado**: testes escritos antes, cobertura alta (cadências, janela/timezone,
      agregação de UMBRELLA, bordas), todos verdes. (11 testes)
- [x] Cálculo de calendário só via `dayRange`/Luxon (`countDistinctDays` em `domain/`); nada de
      `new Date` para período.
- [x] Sem Prisma/Fastify/Zod/tela tocados.
- [x] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar feito vs definição e **parar**.
