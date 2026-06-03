# Tarefa 01 — Domínio + UseCase `createNote`

## Objetivo

Criar a entidade Note (simples) e o UseCase que cria uma nota, derivando o `plainText` a
partir do `doc` (JSON do TipTap) e validando `type`/`scope`. Sem banco, sem rota — só
domínio testado.

## Camada(s)

Domínio + UseCase. (Persistência na Tarefa 02/03; rota na 04.)

## Pré-requisitos

Setup do `SETUP.md` concluído. Pacote `shared/` existe.

## Convenção de idioma

Código, tipos, nomes e identificadores em **inglês**. (Comentários podem ser em PT.)

## Contrato

```ts
// shared/ — schema e tipos
type NoteType = 'DEVOTIONAL' | 'REFLECTION' | 'STUDY_NOTE' | 'NOTE';
type NoteScope = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

interface CreateNoteInput {
  userId: string;
  type: NoteType;
  scope: NoteScope; // default "DAY"
  date: Date; // início do período
  title?: string;
  doc: unknown; // JSON do TipTap (estrutura ProseMirror)
  goalId?: string;
  resourceId?: string;
  eventId?: string;
  labelIds?: string[];
}

interface Note extends CreateNoteInput {
  id: string;
  plainText: string; // DERIVADO do doc
  status: 'ACTIVE';
  createdAt: Date;
}

// O UseCase depende de uma interface de Repository (formalizada na Tarefa 02; aqui o port
// mínimo que o teste preenche com um fake):
interface NoteRepository {
  save(note: Note): Promise<Note>;
}

class CreateNote {
  constructor(private repo: NoteRepository) {}
  async execute(input: CreateNoteInput): Promise<Note> {
    /* ... */
  }
}
```

## Regras de negócio desta fatia

- `plainText` é derivado do `doc` (extrair texto puro da árvore ProseMirror). Função pura,
  testável isoladamente (`docToText`).
- `scope` default = "DAY" quando ausente.
- `status` nasce "ACTIVE".
- `id` e `createdAt` gerados de forma determinística nos testes (injetar geradores ou gerar
  no repo — mantenha o UseCase testável).

## Testes a escrever PRIMEIRO (Vitest, unit, com fake repo)

1. Cria nota com campos mínimos (userId, type, doc) e retorna com `id`, `status:"ACTIVE"`.
2. `plainText` derivado de um `doc` com parágrafos e marcas (negrito etc.).
3. `scope` ausente vira "DAY".
4. `doc` vazio → `plainText` vazio (não quebra).
5. `type` inválido é rejeitado pelo schema Zod (teste do schema em `shared/`).
6. Chama `repo.save` exatamente uma vez com a nota montada.

## Arquivos a tocar

- `packages/shared/src/note.ts` (schema Zod + tipos).
- `packages/backend/src/domain/note.ts` (entidade, se necessária além do tipo).
- `packages/backend/src/usecases/create-note.ts`.
- `packages/backend/src/usecases/__tests__/create-note.test.ts`.
- `packages/backend/src/usecases/_fakes/note-repository-fake.ts` (fake mínimo p/ o teste).
- `packages/backend/src/domain/doc-to-text.ts` (+ teste).

## Fora de escopo

- NÃO implementar Prisma (Tarefa 03).
- NÃO criar rota (Tarefa 04).
- NÃO tratar labels/attachments ainda (vínculo de labels entra na 16).
- NÃO lidar com a regra "um por dia" (Tarefa 06).

## Definição de pronto

- [x] Schema Zod de Note em `shared/`, com `type`/`scope` como `z.enum`.
- [x] Função `docToText` pura, com testes próprios.
- [x] UseCase `CreateNote` implementado contra a interface de Repository.
- [x] Os 6 testes acima passando (`pnpm test`).
- [x] Nenhum import de Fastify ou Prisma no UseCase.
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
