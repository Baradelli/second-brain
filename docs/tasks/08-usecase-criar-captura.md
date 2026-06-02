# Tarefa 08 — Domínio + UseCase `createCapture`

## Objetivo

Criar a entidade Capture (o inbox) e o UseCase que registra uma captura rápida: texto livre,
opcionalmente uma URL e labels, com `reviewAt` padrão derivado do dia de revisão do usuário
(Settings). Sem rota ainda.

## Camada(s)

Domínio + UseCase. Persistência na Tarefa 09; rota na 11.

## Pré-requisitos

- Tabela `Capture` já existe no schema (veio no esqueleto do MVP 1).
- `dayRange`/Luxon disponível (Tarefa 05/05b).
- `Settings` com `reviewWeekday` e `timezone`.

## Convenção de idioma

Código/identificadores em **inglês**.

## Contrato

```ts
// shared/ — schema Zod
export const createCaptureSchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1), // textarea, texto puro (pode ter várias linhas)
  url: z.string().url().optional(),
  reviewAt: z.coerce.date().optional(), // se ausente, calculado pelo próximo dia de revisão
  labelIds: z.array(z.string()).optional(),
});
export type CreateCaptureInput = z.infer<typeof createCaptureSchema>;

interface Capture {
  id: string;
  userId: string;
  text: string;
  url?: string;
  status: 'PENDING';
  reviewAt: Date | null;
  // campos de triagem (preenchidos na revisão, Bloco D): processedAt, promotedToType, promotedToId
  archivedAt: Date | null;
  archiveReason: string | null;
  createdAt: Date;
}

interface CaptureRepository {
  // formalizada por completo na Tarefa 09
  save(c: Capture): Promise<Capture>;
}

class CreateCapture {
  constructor(
    private repo: CaptureRepository,
    private settings: SettingsReader,
  ) {}
  async execute(input: CreateCaptureInput): Promise<Capture>;
}
```

## Regras de negócio

- `status` nasce `PENDING`.
- `text` é texto puro (não é o editor TipTap — captura ≠ escrita). Não derivar nada.
- `reviewAt`:
  - Se enviado no input, usar como veio.
  - Se ausente, calcular o **próximo `reviewWeekday`** a partir de "agora", no `timezone` do
    usuário (Luxon). Ex.: se hoje é terça e a revisão é domingo, `reviewAt` = próximo domingo
    (início do dia local, convertido para UTC). Helper puro reutilizável: `nextWeekday(...)`.
- `labelIds` só vínculo (a persistência do vínculo entra na Tarefa 09 com o Prisma; no fake,
  guardar os ids).

## Leitura de Settings

- O UseCase precisa de `reviewWeekday`/`timezone`. Definir um pequeno port `SettingsReader`
  (ex.: `getByUserId(userId): Promise<{ timezone: string; reviewWeekday: number } | null>`),
  com fake nos testes. Não acoplar o UseCase ao Prisma.

## Testes a escrever PRIMEIRO (unit, com fakes)

1. Cria captura com `text` → `status: 'PENDING'`, `id`, `createdAt`.
2. `reviewAt` ausente → calculado para o próximo dia de revisão no fuso correto.
3. `reviewAt` enviado → respeitado como veio.
4. `text` vazio → rejeitado pelo schema Zod.
5. `nextWeekday` (helper puro): se hoje já é o dia de revisão, decide regra clara
   (ex.: "hoje" vs "próxima semana") — fixar e testar a borda.
6. Chama `repo.save` uma vez com a captura montada.

## Arquivos a tocar

- `packages/shared/src/capture.ts` (schema + tipos) + export no `index.ts`.
- `packages/backend/src/domain/capture.ts` (entidade, se necessária).
- `packages/backend/src/domain/next-weekday.ts` (+ teste).
- `packages/backend/src/usecases/create-capture.ts` (+ teste).
- `packages/backend/src/usecases/ports/settings-reader.ts`.
- `packages/backend/src/usecases/_fakes/capture-repository-fake.ts` (mínimo p/ o teste).
- `packages/backend/src/usecases/_fakes/settings-reader-fake.ts`.

## Fora de escopo

- NÃO implementar Prisma (Tarefa 09).
- NÃO criar rota (Tarefa 11).
- NÃO tratar triagem/arquivamento (Bloco D).

## Definição de pronto

- [x] `createCaptureSchema` em `shared/`.
- [x] `nextWeekday` puro e testado (Luxon, fuso correto) — 4 testes incluindo borda "hoje é o dia".
- [x] `CreateCapture` calcula `reviewAt` padrão pelo `reviewWeekday` do usuário.
- [x] 10 testes passando (6 create-capture + 4 next-weekday).
- [x] UseCase sem import de Fastify/Prisma.
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
