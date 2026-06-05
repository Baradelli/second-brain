# Tarefa 37 — Estender `promoteCapture` para destino `resource` e `goal`

> Continua o **Bloco L**. Hoje a captura só promove para **note** (`PromoteCaptureToNote`).
> Aqui adicionamos promover para **resource** e **goal**, reusando os UseCases de criação
> (`CreateResource`/`CreateGoal`) já prontos. TDD nos novos UseCases.
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.** Em conflito com esta spec, vale aquele
> arquivo.

## Objetivo

Transformar uma captura `PENDING` em um `Resource` ou um `Goal`, marcando a captura como
`PROCESSED` com `promotedToType`/`promotedToId` corretos — exatamente o que
`PromoteCaptureToNote` faz, mas para os outros dois destinos.

## Como é hoje (referência)

`PromoteCaptureToNote` (`src/usecases/promote-capture-to-note.ts`): valida captura existe e
`status==='PENDING'` (senão `CaptureNotFoundError`/`CaptureAlreadyProcessedError`), cria a Note
herdando `userId`/`labelIds` da captura, e dá `captureRepo.update` com
`{ status:'PROCESSED', processedAt, promotedToType:'note', promotedToId: note.id }`.

O campo `Capture.promotedToType` já aceita `'resource' | 'goal' | 'note'`.

## Contrato dos novos UseCases

A captura só tem `text`/`labelIds` — Resource e Goal precisam de mais (tipo, cadência, etc.).
Logo o input traz os campos do destino (o dono preenche o formulário na Tarefa 42). `title`
default = `capture.text` (trim) quando ausente. (Decisão.)

`src/usecases/promote-capture-to-resource.ts`:

```ts
export interface PromoteCaptureToResourceInput {
  captureId: string;
  title?: string;           // default: capture.text (trim)
  type: ResourceType;
  url?: string | null;
  author?: string | null;
  description?: string | null;
  // labelIds herdados da captura (não no input)
}
// retorna { resource: Resource; capture: Capture }
// depende de CaptureRepository + CreateResource
```

`src/usecases/promote-capture-to-goal.ts`:

```ts
export interface PromoteCaptureToGoalInput {
  captureId: string;
  title?: string;           // default: capture.text (trim)
  type: GoalType;
  description?: string | null;
  targetValue?: number | null; unit?: string | null;
  period?: GoalPeriod | null; timesPerPeriod?: number | null; weekdays?: number[];
  startAt?: Date | null; dueAt?: Date | null;
  parentId?: string | null;
}
// retorna { goal: Goal; capture: Capture }
// depende de CaptureRepository + CreateGoal
```

## Regras (o que os testes provam)

Para cada um:

1. Captura inexistente → `CaptureNotFoundError`; captura não-`PENDING` → `CaptureAlreadyProcessedError`.
2. Cria a entidade via `CreateResource`/`CreateGoal` com `userId = capture.userId`,
   `labelIds = capture.labelIds`, `title = input.title?.trim() || capture.text.trim()`.
   **A validação de domínio (ex.: cadência de Goal) é a do CreateGoal** — erros dele
   propagam (`InvalidGoalError`/`InvalidResourceError`).
3. Marca a captura `PROCESSED` com `promotedToType` (`'resource'`/`'goal'`) e
   `promotedToId` = id criado, `processedAt = now`.
4. Retorna `{ resource|goal, capture }` (a captura atualizada).

> Extrair o "consumir captura" (validar PENDING + marcar PROCESSED) num helper compartilhado
> pelos três UseCases (note/resource/goal), evitando repetir a transição. (Não espalhar a regra.)

## Rota — DECIDIDO: opção A (body discriminado por `destination`)

Hoje: `POST /captures/:id/promote` com body `{ type:NoteType, scope?, title? }` (note-específico).
Mantém-se **um único endpoint** `POST /captures/:id/promote`, com body **discriminado por
`destination`**:

```ts
// shared/
promoteCaptureSchema = z.discriminatedUnion('destination', [
  z.object({ destination: z.literal('note'),     type: noteType, scope: noteScope.optional(), title: z.string().optional() }),
  z.object({ destination: z.literal('resource'), title: z.string().optional(), type: resourceType, url, author, description }),
  z.object({ destination: z.literal('goal'),     title: z.string().optional(), type: goalType, /* cadência/medida */ ... }),
]);
```

A rota passa a **exigir `destination`**. Isso muda o contrato atual do promote (o teste de rota
atual passa a mandar `destination:'note'`); como a tela de promote ainda não existe (Tarefa 42),
o impacto é só nesse teste, que será atualizado. A resposta segue discriminada/uniforme:
`{ note | resource | goal, capture }` conforme o destino. (Aprovado pelo dono.)

## Testes a escrever PRIMEIRO

- `src/usecases/__tests__/promote-capture-to-resource.test.ts`: promove (defaults title=text,
  herda labels, marca PROCESSED+promotedToType='resource'); captura inexistente/já processada → erro.
- `src/usecases/__tests__/promote-capture-to-goal.test.ts`: idem p/ goal (ex.: HABIT weekdays);
  erro de cadência do CreateGoal propaga.
- Rota: promover para resource → 201; para goal → 201; destino inválido → 400.

## Arquivos a tocar

- `src/usecases/promote-capture-to-resource.ts` · `promote-capture-to-goal.ts` (+ helper de
  "consumir captura") + testes.
- `packages/shared/src/capture.ts` (ou novo) — `promoteCaptureSchema` discriminado.
- `src/routes/agenda-routes.ts` (rota `/captures/:id/promote`) — ligar os 3 destinos; corrigir o
  timezone hoje hardcoded `getByUserId('owner')` para `capture.userId`. + teste de rota.
- **Não** tocar: domínio de Resource/Goal/Capture (prontos), telas.

## Fora de escopo

- A tela de promoção (Tarefa 42). Agenda com objetivos (38).

## Definição de pronto

- [ ] `promoteCaptureToResource` e `promoteCaptureToGoal` criando a entidade e marcando a
      captura PROCESSED com o `promotedToType` certo; validação de domínio herdada dos creates.
- [ ] Helper de "consumir captura" compartilhado (sem duplicar a transição).
- [ ] Rota de promote suportando os 3 destinos (conforme opção escolhida); timezone correto.
- [ ] Testes (UseCase + rota) escritos antes, verdes; `unit` e `integration` verdes.
- [ ] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar e **parar**.
