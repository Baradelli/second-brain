# Tarefa 42 — Promoção na tela de revisão de captura (note | resource | goal)

> Fecha o **Bloco M** e o **MVP 2**. Hoje a revisão de captura só promove para **note**. Aqui a
> UI passa a oferecer os três destinos, usando o endpoint discriminado da Tarefa 37
> (`POST /captures/:id/promote` com `destination`). Mesmo método visual.

## Método visual

Igual às anteriores: funcional + `@cerebro/ui` + CSS vars + i18n; **dono é QA do visual**;
olhar `docs/design-refs/` se houver, senão herdar de `CapturePage`/`AgendaPage`; travar lógica,
rodar testes.

## Objetivo

Na tela de revisão de captura (hoje `CapturePage`/`ReviewPage` → `/capture`), ao promover uma
captura, o dono escolhe **note**, **resource** ou **goal** e preenche o mínimo de cada destino;
a captura vira a entidade escolhida e fica `PROCESSED`.

## Camada de dados (atualizar em `endpoints.ts`)

O `promoteCaptureToNote` atual usa `{ type }` (sem `destination`). Como a Tarefa 37 mudou o
endpoint para **discriminado por `destination`**, atualizar/estender:

```ts
// resposta discriminada — { note|resource|goal, capture }
promoteCapture(id, body: PromoteCaptureInput): Promise<PromoteResult>
// body usa o promoteCaptureSchema de @cerebro/shared (discriminatedUnion 'destination')
```

Manter um wrapper `promoteCaptureToNote(id, type)` que chama `promoteCapture(id, { destination:'note', type })` se for cômodo p/ não quebrar chamadas existentes — ou atualizar os call-sites. (Ver decisão.)

## UI

- Na revisão de uma captura, a ação **Promover** abre um seletor de **destino** (3 chips/abas:
  Anotação / Recurso / Objetivo — i18n) dentro de um `BottomSheet`.
- Cada destino mostra os campos mínimos (React Hook Form + Zod, usando o branch certo do
  `promoteCaptureSchema`):
  - **note**: `type` (NoteType) + `scope?`/`title?` (como hoje).
  - **resource**: `type` (ResourceType) + `title?` (default = texto da captura) + url/autor/desc.
  - **goal**: `type` (GoalType) + cadência/medida condicional (como no form da Tarefa 40).
- `title` default = texto da captura (o backend também aplica esse default, mas mostrar na UI
  ajuda). Ao confirmar, chama `promoteCapture` e remove a captura da lista de pendentes
  (vira PROCESSED). Erros 400 (ex.: cadência inválida de goal) viram mensagem amigável.
- **i18n**: `promote.destination.*`, reusar `resource.*`/`goal.*` da 39/40.

## Decisões que assumi (revisar)

- **Reusar os formulários** de Resource (39) e Goal (40) dentro do seletor de promoção (extrair
  `ResourceForm`/`GoalForm` reutilizáveis, se ainda não extraídos). Evita duplicar formulário.
- **Wrapper de compatibilidade** `promoteCaptureToNote` mantido chamando o endpoint discriminado
  (`destination:'note'`), para tocar o mínimo nos call-sites atuais.
- **Seletor de destino em chips/abas** dentro do BottomSheet (não 3 botões separados).

## Testes (só fluxos que quebram em silêncio)

`src/__tests__/promote.test.tsx` (ou estender o teste da captura):

- promover para **note** chama `promoteCapture` com `destination:'note'` e remove a captura;
- promover para **resource** chama com `destination:'resource'` + type;
- promover para **goal** (HABIT weekdays) chama com `destination:'goal'`;
- erro 400 do backend exibe mensagem e mantém a captura.

## Arquivos a tocar

- `packages/mobile/src/pages/CapturePage.tsx` (seletor de destino na promoção).
- `endpoints.ts` (`promoteCapture` discriminado; wrapper note).
- `components/ResourceForm.tsx` / `GoalForm.tsx` (reuso; extrair se preciso).
- `locales/*` (+`promote.*`), testes.
- **Não** tocar: backend (já pronto na 37), demais telas além da captura.

## Fora de escopo

- Promover para Event diretamente; edição pós-promoção. Telas 39–41 (já feitas).

## Definição de pronto

- [x] Na revisão de captura, promover oferece note | resource | goal, com o form mínimo de cada,
      chamando `POST /captures/:id/promote` discriminado; captura some da lista ao promover.
- [x] Formulários de Resource/Goal reusados (sem duplicar; `defaultTitle` = texto da captura);
      erros 400 amigáveis (mensagem no sheet, captura mantida).
- [x] `@cerebro/ui` + CSS vars + i18n; testes dos 3 destinos + erro verdes; suíte do mobile verde (71).
- [x] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar e **parar**.
- [x] **MVP 2 concluído** — todas as tarefas 25–42 marcadas no `BACKLOG.md`.
