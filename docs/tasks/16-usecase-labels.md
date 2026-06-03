# Tarefa 16 — Domínio + UseCases de Label (criar, listar em árvore, vincular)

## Objetivo

Gerenciar os labels: criar (com pai opcional, formando a árvore), listar como árvore, e
expor a vinculação a itens. A **tabela `Label` já existe** no Prisma (veio no esqueleto, com
as relações many-to-many para Capture/Note); esta tarefa adiciona o domínio e os UseCases
por cima dela.

## Camada(s)

Domínio + UseCases + repositório (interface + fake + Prisma) + rota, ponta a ponta com testes.

## Pré-requisitos

- Tabela `Label` e relações no Prisma (já existentes).
- Padrão de repositório/rota já estabelecido (Blocos A/C).

## Convenção de idioma

Código/identificadores/rotas em **inglês**.

## Contrato

```ts
// shared/
export const createLabelSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().optional(), // null/ausente = label raiz
  color: z.string().optional(),
});

interface Label {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  color: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  archivedAt: Date | null;
  createdAt: Date;
}

// Árvore para a UI:
interface LabelNode extends Label {
  children: LabelNode[];
}

interface LabelRepository {
  save(l: Label): Promise<Label>;
  byId(id: string): Promise<Label | null>;
  listByUser(userId: string, status?: 'ACTIVE' | 'ARCHIVED'): Promise<Label[]>;
  update(id: string, patch: Partial<Label>): Promise<Label>;
}

class CreateLabel {
  /* valida pai existe e é do mesmo user; sem ciclos */
}
class ListLabelTree {
  /* monta LabelNode[] a partir do flat listByUser */
}
class ArchiveLabel {
  /* soft delete: status ARCHIVED + archivedAt */
}
```

## Regras de negócio

- `CreateLabel`: se `parentId` informado, validar que o pai existe e pertence ao mesmo
  `userId`. Impedir ciclos (um label não pode ser ancestral de si mesmo) — relevante também
  ao mover/editar pai, se houver.
- `ListLabelTree`: buscar flat (`listByUser`) e montar a árvore em memória (`children`).
  Raízes = `parentId == null`. Função de montagem pura e testável.
- `ArchiveLabel`: soft delete (status ARCHIVED + archivedAt), mas **só é permitido arquivar
  um label que NÃO esteja em uso**. "Em uso" =
  - tem vínculo com alguma Note ou Capture, **ou**
  - tem sub-labels (filhos) ativos.
    Se estiver em uso, **não arquiva** e retorna um erro explicativo que diferencia o caso
    (ex.: `LabelInUseError` com mensagem "label em uso por N item(ns)" ou "label tem sub-labels
    ativos"). Nunca apaga, nunca arquiva em cascata silenciosa.
  - Implicação: o `LabelRepository` ganha algo como `usageCount(labelId): Promise<{ items: number; activeChildren: number }>` para o UseCase checar antes de arquivar. O fake simula
    isso nos testes (sem banco); o Prisma conta os vínculos reais.
- Vincular/desvincular label a Note/Capture: como os contratos de Note/Capture já aceitam
  `labelIds`, expor isso é principalmente garantir endpoints/裏 helpers para
  adicionar/remover vínculo sem recriar o item (se ainda não houver). Manter simples.

## Testes (unit + integração + rota, conforme a camada)

1. Criar label raiz → ok; criar com `parentId` válido → ok.
2. `parentId` de outro usuário ou inexistente → erro.
3. Impedir ciclo (label como próprio ancestral) → erro.
4. `ListLabelTree` monta a hierarquia correta (raízes + children aninhados).
5. `ArchiveLabel` faz soft delete quando o label **não** está em uso; e **bloqueia com erro
   explicativo** quando há vínculo com Note/Capture ou quando há sub-labels ativos
   (testar os dois motivos separadamente).
6. (Integração) Prisma: round-trip de label com `parentId`; árvore reconstruída.
7. (Rota) `POST /labels`, `GET /labels` (árvore) e `POST /labels/:id/archive` validados por Zod.

## Arquivos a tocar

- `packages/shared/src/label.ts` (+ export).
- `packages/backend/src/domain/label-tree.ts` (montagem da árvore, pura) (+ teste).
- `packages/backend/src/usecases/create-label.ts`, `list-label-tree.ts`, `archive-label.ts` (+ testes).
- `packages/backend/src/usecases/ports/label-repository.ts`.
- `packages/backend/src/usecases/_fakes/label-repository-fake.ts` (+ teste).
- `packages/backend/src/repositories/prisma-label-repository.ts` (+ integração).
- `packages/backend/src/routes/label-routes.ts` (+ integração) e registro no `server.ts`.

## Fora de escopo

- NÃO implementar rollup de subárvore para "X ativos" (decisão futura no plano).
- NÃO herança de perguntas-guia (isso é decisão da Tarefa 17/futuro).
- NÃO UI (Bloco G).

## Definição de pronto

- [x] Criar/listar-árvore/arquivar label, ponta a ponta, com testes verdes.
- [x] Validação de pai (mesmo user, existe) e prevenção de ciclo.
- [x] Montagem de árvore pura e testada.
- [x] Regra de arquivamento: **bloqueia se o label estiver em uso** (vínculo com itens ou
      sub-labels ativos), com erro explicativo que diferencia o motivo. Nunca cascata/apaga.
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
