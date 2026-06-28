# ADR 0001 — Backlinks/grafo de notas: tabela `NoteLink` materializada

- Status: aceito
- Data: 2026-06-28
- Fase: 4.1 (Backlinks + grafo de notas)

## Contexto

As notas referenciam umas às outras por menções `@` no editor TipTap. No doc JSON
(ProseMirror) cada referência é um nó `{ type: 'mention', attrs: { id: '<noteId>' } }`
(ver `packages/ui/src/components/note-mention.ts`). Precisamos de duas leituras a partir
dessas referências:

- **Backlinks**: dada uma nota, quais notas a mencionam.
- **Grafo**: todas as notas (nós) e os links nota→nota (arestas) do usuário.

A fonte da verdade do conteúdo é o doc JSON. A questão é como derivar os links para
consultá-los de forma barata.

## Decisão

Manter uma tabela **materializada** `NoteLink` (`fromNoteId`, `toNoteId`, `userId`),
com unique em `(fromNoteId, toNoteId)` e índices em `userId` e `toNoteId`.

Os links de **saída** de uma nota são **recomputados e persistidos a cada save** (create
e edit): depois de gravar o doc, o usecase extrai os ids de menção
(`extractMentionIds`, no `domain/`, puro e deduplicado, descartando ids vazios e
auto-referência) e chama `NoteLinkRepository.replaceOutgoing(userId, fromNoteId, ids)`,
que apaga os links de saída atuais e insere o novo conjunto numa transação.

Backlinks e grafo são lidos da tabela e **juntados** com as notas ativas, de modo que
links pendentes (alvo/origem inexistente, arquivado ou de outro usuário) não apareçam.

## Alternativas consideradas

- **Derivar na leitura** (varrer o doc JSON de todas as notas a cada consulta de
  backlink/grafo). Mantém uma fonte única e zero lógica de sincronização, mas torna
  backlinks e grafo O(n·tamanho do doc) por leitura, sem poder usar índices relacionais —
  os volumes crescem e a leitura é o caminho quente (painel da nota, tela de grafo).

## Consequências

- (+) Backlinks e grafo viram consultas relacionais simples e indexadas (`toNoteId`,
  `userId`), rápidas e escaláveis.
- (+) A extração de menções fica num único ponto testável (`extractMentionIds`).
- (−) Custo de uma tabela extra e da lógica de sincronização no save. Mitigado por
  `replaceOutgoing` ser idempotente e atômico (delete + insert em transação), e a leitura
  filtrar links pendentes — então uma eventual aresta órfã nunca é exibida.
- A reconstrução completa (ex.: migração futura) é trivial: rerodar `replaceOutgoing`
  por nota a partir do doc.
