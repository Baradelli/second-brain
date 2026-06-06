# Tarefa 43 — Backend `editLabel` (renomear / cor / mover de pai)

> **Bloco A — Labels**, tarefa A1. Primeira peça da taxonomia: poder **editar** uma label
> (nome, cor, e mover de pai na árvore), com guarda de **ciclo** (profundidade livre). Backend
> com TDD; o resto do bloco (tela de gerência, picker, filtro com rollup) é frontend e vem
> depois. Decisões do bloco em `docs/MELHORIAS.md`.

## Decisões do bloco (já fechadas)

- **Cascata/rollup**: filtrar por um pai inclui os filhos — resolvido **no cliente** (Tarefa A4).
- **Profundidade livre** (vários níveis) → reparent precisa de **guarda de ciclo**.
- **Paleta fixa** de cores na UI; o backend guarda a `color` como string (não amarra à paleta).
- Gerência numa **área de ajustes** (ícone no topo) — frontend (Tarefa A2).

## Estado atual (já pronto)

- `Label` (domínio) com `parentId`, `color`, `status`, `archivedAt`.
- `LabelRepository` já tem `byId` / `update` / `listByUser` / `usageCount`.
- `CreateLabel` valida pai (existe + mesmo user) e ciclo trivial (`parentId === id`).
- Erros: `LabelNotFoundError`, `LabelParentInvalidError`, `LabelCycleError`.
- Rotas: `POST /labels`, `GET /labels` (árvore), `POST /labels/:id/archive`.

## Contrato

`shared/src/label.ts` — adicionar:

```ts
export const editLabelSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).optional(),
  color: z.string().min(1).nullable().optional(),
  parentId: z.string().min(1).nullable().optional(), // null = vira raiz; ausente = não muda
});
export type EditLabelInput = z.infer<typeof editLabelSchema>;
```

`backend/src/usecases/edit-label.ts`:

```ts
export interface EditLabelInput {
  id: string;
  userId: string; // dono; senão LabelNotFoundError (não vaza)
  name?: string;
  color?: string | null;
  parentId?: string | null; // null = raiz; ausente = mantém
}
// depende de LabelRepository (byId + update)
```

## Regras (o que os testes provam)

1. Label inexistente **ou** de outro `userId` → `LabelNotFoundError`.
2. Patch parcial: só altera os campos **presentes** (`name`/`color`/`parentId`); ausentes mantêm.
3. `color: null` limpa a cor; `parentId: null` vira **raiz**.
4. **Reparent** com `parentId` string:
   - pai deve **existir** e ser do **mesmo user** → senão `LabelParentInvalidError`.
   - `parentId === id` → `LabelCycleError`.
   - `parentId` não pode ser um **descendente** de `id` (andar pelos ancestrais do novo pai; se
     encontrar `id`, é ciclo) → `LabelCycleError`. (Profundidade é livre.)
5. Não altera `status`/`archivedAt` (arquivar é outro UseCase).

## Rota

`PATCH /labels/:id` em `label-routes.ts`:

- params `{ id }`, body `editLabelSchema`; response `200: labelResponseSchema`.
- Erros: `LabelNotFoundError`→404, `LabelParentInvalidError`/`LabelCycleError`→400.
- Handler chama `editLabel.execute({ id: req.params.id, ...req.body })`.

## Testes

- **Unit** `edit-label.test.ts` (fake repo): renomeia; troca cor; cor→null; reparent válido;
  reparent p/ si mesmo → ciclo; reparent p/ descendente → ciclo; pai de outro user → inválido;
  id/owner errado → not found; patch parcial não mexe no resto.
- **Rota** (integração, 1–2 caminhos): PATCH renomeia → 200; PATCH com dono errado → 404.

## Arquivos a tocar

- `packages/shared/src/label.ts` (+`editLabelSchema`).
- `packages/backend/src/usecases/edit-label.ts` (novo) + teste.
- `packages/backend/src/routes/label-routes.ts` (+rota) + teste de rota.
- **Não** tocar: domínio Label, repo (já tem `update`), telas.

## Definição de pronto

- [x] `editLabel` (nome/cor/reparent) com guarda de ciclo (inclui descendente), patch parcial,
      not-found para dono errado; sem mexer em status/archivedAt. (9 testes)
- [x] `editLabelSchema` em `shared/`; rota `PATCH /labels/:id` com erros mapeados (404/400).
- [x] Testes unit (9) + rota (2) verdes; `unit` (242) e `integration` (109) verdes.
- [x] Marcar `MELHORIAS` e reportar.
