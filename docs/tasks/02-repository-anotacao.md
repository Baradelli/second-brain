# Tarefa 02 — Repository de Note: interface + fake em memória

## Objetivo

Formalizar a interface `NoteRepository` (o "port" de persistência) e fornecer uma
implementação **fake em memória** que os testes de UseCase usam. Ainda sem Prisma.

## Camada(s)

Contrato de persistência (interface) + fake de teste. A implementação real é a Tarefa 03.

## Por que separado da Tarefa 01

Na 01, o fake era mínimo (só `save`). Aqui consolidamos a interface completa que os próximos
UseCases (edit, findOfTheDay, list) vão precisar, e um fake reutilizável por todos.

## Convenção de idioma

Código, tipos e identificadores em **inglês**.

## Contrato

```ts
interface NoteRepository {
  save(note: Note): Promise<Note>;
  byId(id: string): Promise<Note | null>;
  // filtro usado por "note do dia" e por listagens:
  find(filter: {
    userId: string;
    type?: NoteType;
    scope?: NoteScope;
    // intervalo de data (já calculado no fuso do usuário pela camada de cima):
    from?: Date;
    to?: Date;
    status?: 'ACTIVE' | 'ARCHIVED';
  }): Promise<Note[]>;
  update(id: string, patch: Partial<Note>): Promise<Note>;
}
```

## Implementação fake (em memória)

- Guarda notas num array/Map.
- `find` aplica os filtros em memória (incluindo o intervalo `from`/`to`).
- Determinístico: permite injetar gerador de id/data para testes previsíveis.
- Mora em `packages/backend/src/usecases/_fakes/` e é exportado para reuso.

## Testes a escrever PRIMEIRO

1. `save` + `byId` retorna a mesma nota.
2. `find` por `userId` + `type` filtra corretamente.
3. `find` por intervalo `from`/`to` inclui/exclui pelas datas certas (bordas).
4. `find` por `status` separa ativos de arquivados.
5. `update` aplica o patch e persiste.

## Arquivos a tocar

- `packages/backend/src/usecases/ports/note-repository.ts` (a interface).
- `packages/backend/src/usecases/_fakes/note-repository-fake.ts` (impl em memória).
- `packages/backend/src/usecases/_fakes/__tests__/note-repository-fake.test.ts`.
- Ajustar a Tarefa 01 para importar a interface daqui (remover o port inline).

## Fora de escopo

- NÃO implementar Prisma (Tarefa 03).
- NÃO adicionar métodos que nenhum UseCase do MVP 1 usa (YAGNI).

## Definição de pronto

- [x] Interface `NoteRepository` definida e usada pela Tarefa 01.
- [x] Fake em memória implementando todos os métodos.
- [x] 5 testes do fake passando (+ 1 extra: update lança erro para id inexistente).
- [x] Teste da Tarefa 01 atualizado para usar o fake consolidado, ainda verde.
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
