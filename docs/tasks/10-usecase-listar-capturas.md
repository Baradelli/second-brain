# Tarefa 10 — UseCases `listPendingCaptures` e `listArchived`

## Objetivo

Listar as capturas a revisar (fila) e as arquivadas (o "arquivo morto"), reusando o
`CaptureRepository.find`.

## Camada(s)

UseCase. Usa o fake nos testes.

## Pré-requisitos

- Tarefas 08–09.

## Convenção de idioma

Código/identificadores em **inglês**.

## Contrato

```ts
class ListPendingCaptures {
  constructor(private repo: CaptureRepository) {}
  // "a revisar hoje": status PENDING e reviewAt <= agora (no fuso do usuário)
  async execute(input: {
    userId: string;
    reference: Date;
    timezone: string;
  }): Promise<Capture[]>;
}

class ListArchived {
  constructor(private repo: CaptureRepository) {}
  async execute(input: { userId: string }): Promise<Capture[]>;
}
```

Regras:

- `listPendingCaptures`: `status: 'PENDING'` + `reviewUntil` = fim do dia local de `reference`
  (usar `dayRange(...).to`). Assim capturas agendadas para hoje ou já vencidas aparecem.
  - Decisão a confirmar: incluir PENDING **sem** `reviewAt` (capturadas sem data)? Sugestão:
    incluir — uma captura sem data deve aparecer para revisão, não sumir. Documentar a escolha.
- `listArchived`: `status: 'ARCHIVED'`, ordenado por `archivedAt` desc (mais recente primeiro).
- Ambos só do `userId`.

## Testes a escrever PRIMEIRO (unit, com fake)

1. `listPendingCaptures` retorna as PENDING com `reviewAt` no passado/hoje (fuso correto).
2. Não retorna as agendadas para o futuro.
3. Inclui PENDING sem `reviewAt` (conforme a regra fixada).
4. Não retorna PROCESSED nem ARCHIVED.
5. `listArchived` retorna só ARCHIVED, ordenadas por `archivedAt` desc.

## Arquivos a tocar

- `packages/backend/src/usecases/list-pending-captures.ts` (+ teste).
- `packages/backend/src/usecases/list-archived.ts` (+ teste).

## Fora de escopo

- NÃO arquivar/promover aqui (Bloco D).
- NÃO criar rota (Tarefa 11).

## Definição de pronto

- [x] `listPendingCaptures` respeita o "hoje" no fuso do usuário e a regra de `reviewAt` nulo.
- [x] `listArchived` ordenada por `archivedAt` desc.
- [x] 5 testes passando (`pnpm test`).
- [x] Decisão sobre `reviewAt` nulo: **incluir** — captura sem data aparece sempre para revisão.
      Implementado filtrando no UseCase (`reviewAt === null || reviewAt <= endOfDay`).
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
