# Tarefa 18 — Attachment: `attachFile` a uma Note

## Objetivo

Anexar um arquivo (imagem, PDF etc.) a uma Note — no MVP 1, apenas **guardar URL e
metadados**. A foto de página manuscrita é o caso principal. A transcrição/OCR fica para o
MVP 5; aqui só o registro do anexo.

## Camada(s)

Domínio + UseCase + repositório + rota, ponta a ponta com testes.

## Pré-requisitos

- Tabela `Attachment` (polimórfica: Note/Capture/Resource) já existe no schema.
- Bloco A (Note) concluído.

## Convenção de idioma

Código/identificadores/rotas em **inglês**.

## Contrato

```ts
// shared/
export const attachFileSchema = z.object({
  userId: z.string().min(1),
  noteId: z.string().min(1), // no MVP 1, anexo de Note (capture/resource ficam para depois)
  url: z.string().url(), // o upload em si é responsabilidade externa; aqui só a URL
  type: z.enum(['image', 'pdf', 'audio', 'video', 'other']),
  mimeType: z.string().optional(),
  name: z.string().optional(),
  size: z.number().int().optional(),
});

interface Attachment {
  id: string;
  userId: string;
  url: string;
  type: string;
  mimeType: string | null;
  name: string | null;
  size: number | null;
  transcription: string | null; // null no MVP 1 (OCR é MVP 5)
  ocrStatus: string | null; // null no MVP 1
  noteId: string | null;
  captureId: string | null;
  createdAt: Date;
}

interface AttachmentRepository {
  save(a: Attachment): Promise<Attachment>;
  listByNote(noteId: string): Promise<Attachment[]>;
}

class AttachFile {
  constructor(
    private repo: AttachmentRepository,
    private noteRepo: NoteRepository,
  ) {}
  async execute(input: AttachFileInput): Promise<Attachment>;
}
```

## Regras de negócio

- Validar que a Note (`noteId`) existe e é do `userId`.
- `transcription`/`ocrStatus` ficam `null` — sem OCR no MVP 1 (estrutura pronta para o MVP 5).
- **Onde o arquivo realmente mora:** decisão de storage (disco/S3) é separada (está nas
  decisões em aberto do plano). Aqui o UseCase recebe uma `url` já existente; o mecanismo de
  upload que gera essa URL **não** é escopo desta tarefa. Documentar isso claramente.
- `listByNote` para a tela do editor exibir os anexos da nota.

## Testes (unit + integração + rota)

1. Anexar a uma Note existente → cria Attachment com `noteId`, `type`, `url`.
2. Note inexistente / de outro user → erro.
3. `transcription`/`ocrStatus` nascem `null`.
4. `listByNote` retorna os anexos da nota.
5. (Rota) `POST /notes/:id/attachments` e `GET /notes/:id/attachments` validados por Zod.

## Arquivos a tocar

- `packages/shared/src/attachment.ts` (+ export).
- `packages/backend/src/usecases/attach-file.ts` (+ teste).
- `packages/backend/src/usecases/ports/attachment-repository.ts` (+ fake + teste).
- `packages/backend/src/repositories/prisma-attachment-repository.ts` (+ integração).
- `packages/backend/src/routes/attachment-routes.ts` (+ integração) e registro.

## Fora de escopo

- NÃO implementar upload/storage real (decisão de infra à parte).
- NÃO OCR/transcrição (MVP 5).
- NÃO anexar a Capture/Resource ainda (só Note no MVP 1).
- NÃO UI (Bloco G).

## Definição de pronto

- [x] `attachFile` registra anexo (URL + metadados) numa Note validada.
- [x] `transcription`/`ocrStatus` nulos; estrutura pronta para OCR futuro.
- [x] `listByNote` funcional; rotas validadas por Zod.
- [x] Testes verdes (unit + integração + rota).
- [x] **Com isso o Bloco F encerra e o backend do MVP 1 está completo** (faltam só os
      Blocos G — frontend — e H — offline).
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
