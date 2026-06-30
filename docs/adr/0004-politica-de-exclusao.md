# ADR 0004 — Política de exclusão: arquivar reversível + hard delete bloqueado por referência

- Status: aceito
- Data: 2026-06-28
- Fase: Excluir/arquivar com confirmação (web/desktop)

## Contexto

O dono pediu poder "excluir qualquer coisa que cria", com modal de confirmação. O projeto
já distinguia, só para `Goal`, dois conceitos: **arquivar** (soft delete reversível, via
`status` + `archivedAt`) e **excluir** (hard delete, irreversível, permitido só em objetivo
arquivado e sem histórico de `done`). As demais entidades criáveis (`Note`, `Capture`,
`Label`, `StudyItem`, `Publication`, `Resource`) tinham, no máximo, arquivar — e nenhuma
expunha hard delete na UI.

Precisávamos generalizar o modelo para todas as entidades sem abrir mão das duas garantias
do projeto: **`Event`/`Recall` são logs imutáveis** e **nada de cascata destrutiva
implícita** (o dono nunca perde dados em silêncio).

## Decisão

Modelo único em duas etapas, igual para toda entidade criável:

1. **Arquivar** é a remoção do dia a dia: reversível (`status='ARCHIVED'` + `archivedAt`),
   sai das listagens ativas, dá para **restaurar** (`unarchive`). `Resource` ganhou
   `archive`/`unarchive` do zero para fechar o conjunto.
2. **Excluir de vez** (hard delete) só age sobre item **já arquivado** e é **bloqueado se
   houver referência forte** — espelha a regra que o `DeleteGoal` já usava. Caso bloqueado,
   o UseCase lança um erro de domínio, a rota responde **409** e a modal explica o porquê
   (sem excluir).

Regras de bloqueio por entidade (derivadas de `schema.prisma`):

| Entidade        | Hard delete bloqueado se…                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| **Note**        | há backlinks (outras notas a mencionam), anexos, é fichamento de `StudyItem`, ou rascunho de `Publication` |
| **Capture**     | tem anexos                                                                                                 |
| **Label**       | está em uso (notas/capturas) ou tem filhas ativas (reusa `LabelInUseError`)                                |
| **StudyItem**   | tem `Recall` no histórico (log imutável)                                                                   |
| **Publication** | (folha — sem referência de entrada; basta estar arquivada)                                                 |
| **Resource**    | há `Note` ou `StudyItem` apontando para ele                                                                |
| **Goal**        | tem filhos ou evento `done` (já existia)                                                                   |

A **modal de confirmação aparece nas duas ações** (arquivar e excluir), conforme escolha do
dono — com a exceção pragmática da **triagem de capturas** na Revisão, onde arquivar segue
um toque só (loop rápido, reversível); a modal fica reservada ao excluir permanente, que é
irreversível.

Na UI (web/desktop), as ações moram na **aba de detalhe** de cada entidade (ativo → Arquivar;
arquivado → Restaurar + Excluir permanentemente). `Label` e `Capture`, que não têm aba de
detalhe, expõem as ações inline na própria lista de arquivados.

## Alternativas consideradas

- **Hard delete com cascata leve** (excluir mesmo referenciado, limpando as referências:
  menção `@` vira texto, label some dos itens, etc.). Rejeitada: cada entidade exigiria
  regras de cascata próprias e abre porta para perda de dado implícita — o oposto da
  garantia "nada some em silêncio".
- **Excluir e deixar degradar** (sem cascata; o leitor lida com referências quebradas).
  Rejeitada pelo mesmo motivo: backlinks quebrados e FKs órfãs são exatamente o que o
  bloqueio evita.

## Consequências

- (+) Um modelo só, previsível, para todas as entidades; o usuário sempre consegue desfazer
  até o passo do hard delete.
- (+) Logs imutáveis (`Event`, `Recall`) nunca são apagados em massa — viram condição de
  bloqueio, preservando o histórico.
- (+) Cada `delete-*` UseCase é testado (TDD, repo fake) cobrindo "só arquivado" e cada
  condição de bloqueio; rotas mapeiam os erros para 404/409.
- (−) Para excluir algo referenciado, o dono precisa primeiro desfazer as referências
  (arquivar/excluir os filhos, remover a label dos itens, etc.). É atrito deliberado:
  exclusão permanente deve custar um pouco.
- A checagem de referência de `Note` (fichamento/rascunho) varre os itens do usuário em
  memória; no volume pessoal é barato. Se um dia escalar, vira consulta indexada.
