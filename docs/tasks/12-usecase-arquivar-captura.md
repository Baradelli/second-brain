# Tarefa 12 — UseCase `archiveCapture`

## Objetivo

Arquivar uma captura (soft delete): some da fila de revisão mas continua no banco. Nunca
exclui. Opcionalmente registra um motivo.

## Camada(s)

UseCase. Usa `CaptureRepository.update`.

## Pré-requisitos

- Bloco C (Capture, repositório com `byId`/`update`).

## Convenção de idioma

Código/identificadores em **inglês**.

## Contrato

```ts
interface ArchiveCaptureInput {
  id: string;
  reason?: string; // opcional ("não faz mais sentido", "já fiz"...)
}

class ArchiveCapture {
  constructor(private repo: CaptureRepository) {}
  async execute(input: ArchiveCaptureInput): Promise<Capture>;
}
```

Regras:

- `status` → `ARCHIVED`; setar `archivedAt` (instante atual) e `archiveReason` se enviado.
- Captura inexistente → erro claro (`CaptureNotFoundError`).
- Idempotência razoável: arquivar uma já arquivada não quebra (retorna a mesma; não há
  problema em re-setar `archivedAt`, mas documente a escolha).
- É soft delete — **não** apagar a linha.

## Testes a escrever PRIMEIRO (unit, com fake)

1. Arquivar uma PENDING → `status: 'ARCHIVED'`, `archivedAt` setado.
2. Com `reason` → grava `archiveReason`.
3. Captura inexistente → erro.
4. Não aparece mais em `listPendingCaptures`; aparece em `listArchived`.

## Arquivos a tocar

- `packages/backend/src/usecases/archive-capture.ts` (+ teste).
- `packages/backend/src/domain/errors.ts` (`CaptureNotFoundError`, se necessário).

## Fora de escopo

- NÃO promover (Tarefa 13).
- NÃO desarquivar (decisão futura no plano).
- NÃO rota ainda (pode entrar junto da rota de revisão depois, ou no Bloco E/G).

## Definição de pronto

- [x] `archiveCapture` faz soft delete com `archivedAt` e `reason` opcional.
- [x] 4 testes passando (`pnpm test`).
- [x] Linha nunca é apagada.
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
