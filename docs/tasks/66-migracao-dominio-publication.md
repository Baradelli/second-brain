# Tarefa 66 — Migração + domínio `Publication` (Bloco O)

> Abre o **Bloco O — Ensinar para Reter**. Cria a entidade `Publication` (rascunho de
> post/artigo/aula/vídeo derivado de um artefato de estudo). Mirror estrutural de `Resource`
> (`stage` de pipeline + `status` de soft delete, separados). Migração + tipos de domínio; sem
> regra de negócio (UseCases na 67). Design em `docs/LEITURA-RETENTIVA.md` (§5).
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.**

## Objetivo

Deixar o banco e o domínio prontos para o pipeline de publicação. **Funciona sem IA** — a IA do
Bloco P só assiste depois.

## Decisões (mirror de `Resource`)

- **Dois campos distintos** (como `Resource.stage` ≠ `Resource.status`):
  - `stage` = pipeline `'idea' | 'draft' | 'published'` — `String` + `z.enum` (ainda evolui).
  - `status` = `GeneralStatus` (`ACTIVE | ARCHIVED`) — soft delete padrão + `archivedAt`.
- `format` = `'linkedin' | 'substack' | 'blog' | 'lesson' | 'video'` — `String` + `z.enum`.
- **Fonte polimórfica leve**: `sourceType` (`'study_item'|'note'|'resource'|'recap'`) + `sourceId`
  (string, **sem FK** — fonte heterogênea; integridade é responsabilidade da aplicação, como em
  `Capture.promotedToId`).
- **Rascunho reusa o editor**: `noteId` (FK opcional → `Note`) guarda o conteúdo (TipTap).
- `publishedAt` preenchido quando `stage` vira `published` (regra de aplicação, Tarefa 67).
- Labels via m2m (`PublicationLabels`), padrão dos demais.

## Schema a adicionar (`schema.prisma`)

```prisma
model Publication {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  sourceType  String        // "study_item"|"note"|"resource"|"recap" (z.enum)
  sourceId    String        // id da fonte (sem FK — fonte heterogênea)
  format      String        // "linkedin"|"substack"|"blog"|"lesson"|"video" (z.enum)
  stage       String        @default("idea") // "idea"|"draft"|"published" (z.enum)
  title       String
  noteId      String?       // rascunho (TipTap) reaproveitando Note
  note        Note?         @relation("PublicationDraft", fields: [noteId], references: [id])
  publishedAt DateTime?
  status      GeneralStatus @default(ACTIVE)
  archivedAt  DateTime?
  createdAt   DateTime      @default(now())

  labels Label[] @relation("PublicationLabels")
}
```

Edições: `User` ganha `publications Publication[]`; `Note` ganha
`publications Publication[] @relation("PublicationDraft")`; `Label` ganha
`publications Publication[] @relation("PublicationLabels")`.

## Domínio (`src/domain/publication.ts`)

```ts
export type PublicationFormat =
  | 'linkedin'
  | 'substack'
  | 'blog'
  | 'lesson'
  | 'video';
export type PublicationStage = 'idea' | 'draft' | 'published';
export type PublicationSourceType =
  | 'study_item'
  | 'note'
  | 'resource'
  | 'recap';

export const PUBLICATION_FORMATS: readonly PublicationFormat[] = [
  /* … */
];
export const PUBLICATION_STAGES: readonly PublicationStage[] = [
  'idea',
  'draft',
  'published',
];
export const PUBLICATION_SOURCE_TYPES: readonly PublicationSourceType[] = [
  /* … */
];

export interface Publication {
  id: string;
  userId: string;
  sourceType: PublicationSourceType;
  sourceId: string;
  format: PublicationFormat;
  stage: PublicationStage;
  title: string;
  noteId: string | null;
  publishedAt: Date | null;
  status: 'ACTIVE' | 'ARCHIVED';
  archivedAt: Date | null;
  createdAt: Date;
  labelIds: string[];
}
```

## Testes

Migração pura (sem TDD de regra). Smoke de contrato
(`leitura-retentiva-publication-schema.contract.integration.test.ts`): cria `User` →
`Publication` (com `noteId` → `Note` e um `Label`) e lê de volta; defaults `stage='idea'`,
`status='ACTIVE'`, `publishedAt=null`. Mirror da 58.

## Arquivos

- `prisma/schema.prisma` + migração `publication`.
- `src/domain/publication.ts` (tipos + listas de enum).
- smoke de contrato (novo).
- **Não** tocar `shared/`/UseCases/rotas (Tarefa 67).

## Definição de pronto

- [x] Schema + migração aplicada limpa; `prisma generate` tipa `Publication`.
      (`20260627164943_publication`)
- [x] Domínio `Publication` com `stage` (pipeline) e `status` (soft delete) separados.
      (`src/domain/publication.ts`)
- [x] Smoke de contrato verde. Sem UseCase/Zod/rota/tela.
      (`leitura-retentiva-publication-schema.contract.integration.test.ts`, 2 testes)
- [x] Marcar BACKLOG + reportar.
