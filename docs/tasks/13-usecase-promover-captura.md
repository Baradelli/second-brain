# Tarefa 13 — UseCase `promoteCaptureToNote`

## Objetivo

Transformar uma captura em uma Note (o caminho de "promover" do MVP 1): cria a nota a partir
do texto da captura e marca a captura como processada, registrando o destino. É onde captura
e anotação se conectam.

## Camada(s)

UseCase que orquestra dois outros (`CreateNote` + `CaptureRepository.update`).

## Pré-requisitos

- Bloco A (CreateNote) e Bloco C (Capture + repositório).

## Convenção de idioma

Código/identificadores em **inglês**.

## Contrato

```ts
interface PromoteCaptureToNoteInput {
  captureId: string;
  type: NoteType; // ex.: NOTE ou STUDY_NOTE (o usuário escolhe ao promover)
  scope?: NoteScope; // default DAY
  reference: Date; // "agora"
  timezone: string; // de Settings (para a data da nota)
  title?: string;
  // doc inicial: a partir do texto da captura (ver regra)
}

class PromoteCaptureToNote {
  constructor(
    private captureRepo: CaptureRepository,
    private createNote: CreateNote,
  ) {}
  async execute(
    input: PromoteCaptureToNoteInput,
  ): Promise<{ note: Note; capture: Capture }>;
}
```

Regras:

- Buscar a captura por `captureId`; inexistente → erro.
- Construir um `doc` TipTap mínimo a partir do `text` da captura (um parágrafo com o texto).
  Helper `textToDoc(text)` puro — inverso conceitual do `docToText`. O `plainText` resultante
  bate com o texto original.
- Herdar os `labelIds` da captura para a nota (a captura pode ter labels).
- `createNote` com `date` derivada do `reference`/`timezone` (início do dia local, como nas
  outras notas).
- Atualizar a captura: `status: 'PROCESSED'`, `processedAt` = agora, `promotedToType: 'note'`,
  `promotedToId` = id da nota criada.
- Retornar ambos (a nota nova e a captura atualizada).
- Captura já processada/arquivada → erro claro (não promover duas vezes).

> Promover para `resource`/`goal` NÃO existe no MVP 1 (Resource/Goal são MVP 2). Aqui só
> `note`. A estrutura `promotedToType` já está pronta para os outros destinos no futuro.

## Testes a escrever PRIMEIRO (unit, com fakes)

1. Promove uma PENDING → cria Note com `doc` derivado do texto; `plainText` == texto.
2. A captura vira `PROCESSED` com `processedAt`, `promotedToType: 'note'`, `promotedToId`.
3. Labels da captura são herdadas pela nota.
4. Captura inexistente → erro.
5. Captura já PROCESSED → erro (não promove de novo).
6. `textToDoc` (helper puro): texto com quebras de linha vira doc válido; round-trip com
   `docToText` preserva o conteúdo.

## Arquivos a tocar

- `packages/backend/src/usecases/promote-capture-to-note.ts` (+ teste).
- `packages/backend/src/domain/text-to-doc.ts` (+ teste).
- `packages/backend/src/domain/errors.ts` (erros de captura já processada, se necessário).

## Fora de escopo

- NÃO promover para resource/goal (MVP 2).
- NÃO rota ainda (pode entrar junto da revisão/agenda ou no Bloco G).

## Definição de pronto

- [x] `promoteCaptureToNote` cria a Note e marca a captura como PROCESSED com destino.
- [x] `textToDoc` puro e testado; round-trip com `docToText` preserva o conteúdo.
- [x] Labels herdadas; dupla promoção barrada.
- [x] 6 testes passando (`pnpm test`).
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
