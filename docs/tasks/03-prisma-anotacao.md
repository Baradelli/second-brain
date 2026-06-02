# Tarefa 03 — Implementação Prisma do `NoteRepository` + teste de contrato

## Objetivo

Implementar o `NoteRepository` (interface da Tarefa 02) usando Prisma/Postgres, e provar
com um **teste de contrato** que ela cumpre o mesmo comportamento que o fake em memória.

## Camada(s)

Persistência real (repositories/) + teste de integração contra o Postgres do Docker.

## Pré-requisitos

- Tarefas 01 e 02 concluídas (interface `NoteRepository` = `save`, `byId`, `find`, `update`).
- `pnpm db:up` + `pnpm prisma:migrate` rodados (tabela `Note` existe).

## Convenção de idioma

Código, tipos e identificadores em **inglês**.

## Contrato

Implementar a MESMA interface da Tarefa 02 (não mudar a assinatura):

```ts
class PrismaNoteRepository implements NoteRepository {
  constructor(private prisma: PrismaClient) {}
  save(note: Note): Promise<Note>;
  byId(id: string): Promise<Note | null>;
  find(filter: {
    userId: string;
    type?: NoteType;
    scope?: NoteScope;
    from?: Date; // intervalo sobre Note.date
    to?: Date;
    status?: 'ACTIVE' | 'ARCHIVED';
  }): Promise<Note[]>;
  update(id: string, patch: Partial<Note>): Promise<Note>;
}
```

## Regras de mapeamento

- `find`: `from`/`to` viram `where: { date: { gte: from, lte: to } }` (omitir o lado ausente).
  `type`, `scope`, `status`, `userId` entram no `where` só quando presentes.
- `doc` é `Json` no Prisma; persistir/ler como objeto sem stringificar à mão.
- `update` aplica patch parcial; não sobrescrever campos não enviados.
- Converter o registro do Prisma para a entidade de domínio `Note` (mesmo shape que o fake
  retorna) — manter o domínio agnóstico do Prisma.

## Testes a escrever (integração — arquivo `*.integration.test.ts`)

Rodam contra o Postgres real (`pnpm test:integration`). Limpar a tabela antes de cada teste.

1. `save` + `byId` retorna a mesma nota (round-trip com `doc` JSON preservado).
2. `find` por `userId` + `type` filtra corretamente.
3. `find` por intervalo `from`/`to` respeita as bordas (inclusivo).
4. `find` por `status` separa ACTIVE de ARCHIVED.
5. `update` aplica o patch e persiste; campos não enviados permanecem.
6. **Contrato:** o mesmo conjunto de asserções que o teste do fake (Tarefa 02) passa aqui
   — comportamento idêntico entre fake e Prisma.

## Arquivos a tocar

- `packages/backend/src/repositories/prisma-note-repository.ts`.
- `packages/backend/src/repositories/__tests__/prisma-note-repository.integration.test.ts`.
- Se ajudar, um helper de teste para limpar/conectar o banco
  (`packages/backend/src/repositories/__tests__/_db.ts`).

## Fora de escopo

- NÃO criar rota ainda (Tarefa 04).
- NÃO adicionar métodos novos à interface.
- NÃO mexer no UseCase da Tarefa 01.

## Definição de pronto

- [ ] `PrismaNoteRepository` implementa a interface sem alterá-la.
- [ ] 6 testes de integração passando (`pnpm test:integration`).
- [ ] `doc` (JSON) preservado no round-trip.
- [ ] Domínio continua sem importar Prisma (só o repositório conhece o Prisma).
- [ ] Reporte ao dono: arquivos tocados + checklist marcado.
