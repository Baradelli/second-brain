# Tarefa 09 — Repository de Capture (interface + fake + Prisma + contrato)

## Objetivo

Formalizar o `CaptureRepository`, com fake em memória e implementação Prisma, provados por
teste de contrato. Espelha o que foi feito para Note (Tarefas 02–03), agora num passo só.

## Camada(s)

Port + fake (unit) + Prisma (integração).

## Pré-requisitos

- Tarefa 08 (entidade Capture e o fake mínimo).
- Tabela `Capture` migrada.

## Convenção de idioma

Código/identificadores em **inglês**.

## Contrato

```ts
interface CaptureRepository {
  save(c: Capture): Promise<Capture>;
  byId(id: string): Promise<Capture | null>;
  find(filter: {
    userId: string;
    status?: 'PENDING' | 'PROCESSED' | 'ARCHIVED';
    reviewUntil?: Date; // capturas com reviewAt <= reviewUntil (para "a revisar hoje")
  }): Promise<Capture[]>;
  update(id: string, patch: Partial<Capture>): Promise<Capture>;
}
```

Notas de mapeamento (Prisma):

- `find` por `status` e, quando `reviewUntil` presente, `reviewAt: { lte: reviewUntil }`.
- Vínculo de `labels` (many-to-many) — persistir os `labelIds` via relação do Prisma.
- `update` parcial; usado depois pela triagem (Bloco D) para `status`/`processedAt`/destino.

## Testes

Fake (unit) e Prisma (integração `*.integration.test.ts`) compartilham o mesmo conjunto de
asserções (teste de contrato):

1. `save` + `byId` round-trip.
2. `find` por `status` separa PENDING/PROCESSED/ARCHIVED.
3. `find` com `reviewUntil` retorna só as vencidas/no prazo (bordas).
4. `update` aplica patch parcial.
5. Vínculo de labels persiste e volta no `find`/`byId` (no Prisma).

## Arquivos a tocar

- `packages/backend/src/usecases/ports/capture-repository.ts`.
- `packages/backend/src/usecases/_fakes/capture-repository-fake.ts` (consolidar o da Tarefa 08).
- `packages/backend/src/usecases/_fakes/__tests__/capture-repository-fake.test.ts`.
- `packages/backend/src/repositories/prisma-capture-repository.ts`.
- `packages/backend/src/repositories/__tests__/prisma-capture-repository.integration.test.ts`.

## Fora de escopo

- NÃO criar rota (Tarefa 11).
- NÃO adicionar métodos sem UseCase que os use (YAGNI).

## Definição de pronto

- [x] Interface `CaptureRepository` definida e usada pela Tarefa 08.
- [x] Fake e Prisma implementam a interface; mesmo comportamento (contrato).
- [x] 7 testes unit do fake + 7 integração do Prisma passando.
- [x] Vínculo de labels persistido (connect/set no Prisma, array simples no fake).
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
