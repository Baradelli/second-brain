# ADR 0005 — Paleta de grifos como JSON no Settings (não entidade própria)

- Status: aceito
- Data: 2026-06-30
- Fase: Grifos (Highlights) por Recurso + paleta global de cores

## Contexto

O dono pediu, para cada Recurso, uma **tabela de grifos** (marca-textos): cada linha tem uma
**cor com significado**, a frase grifada e um comentário. Os significados das cores são uma
**configuração global** do usuário, totalmente customizável (adicionar, remover, renomear,
recolorir). O `Highlight` referencia uma cor; renomear/recolorir não pode quebrar grifos já
criados.

Surgiu a pergunta de modelagem: onde mora a paleta de cores? Duas formas se encaixavam no
projeto:

1. **Entidade `HighlightColor` própria**, no padrão de `Label` (tabela com `color`,
   soft-delete, contagem de uso antes de excluir) — porta, impl Prisma, fake, usecases,
   rotas e schema dedicados.
2. **Array JSON num campo do `Settings`** (config por-usuário que já existe, com upsert).

## Decisão

A paleta vive como **`Settings.highlightColors`: `Array<{ id, color, name, order }>`** (JSONB),
não como entidade própria. O `Highlight.colorId` referencia o **`id` estável** de uma entrada
da paleta — por isso renomear/recolorir uma cor não afeta grifos antigos.

Detalhes que sustentam a escolha:

- **Paleta efetiva com seed.** Quando `highlightColors` está vazio (usuário nunca configurou,
  ou linha de `Settings` anterior à feature), a leitura cai num **seed determinístico** de 5
  cores com **ids fixos** (`hl-yellow`, `hl-pink`, …). Como os ids são estáveis, um grifo
  criado contra o seed continua válido depois que a primeira edição persiste a paleta. O
  helper `effectiveHighlightColors` centraliza essa regra (back, web e mobile concordam).
- **Mutação por usecases dedicados** (`list/add/edit/remove-highlight-color`) que operam sobre
  a paleta efetiva e persistem via `SettingsRepository.upsert`. Isso mantém o `UpdateSettings`
  genérico limpo e fora da paleta.
- **Integridade na remoção.** Remover uma cor é **bloqueado se algum grifo ativo a usa**
  (`HighlightRepository.countByColor` > 0 → `HighlightColorInUseError` → HTTP **409**),
  espelhando a filosofia do ADR 0004 (não deixar referência forte órfã). Não há FK no banco
  entre `Highlight.colorId` e a paleta (ela é JSON), então a integridade é garantida no
  usecase, não pelo Postgres.

## Alternativas consideradas

- **Entidade `HighlightColor` (como `Label`).** Rejeitada por peso desproporcional: a paleta
  é uma coleção pequena, por-usuário, editada em bloco numa tela de Config — não precisa de
  árvore, relacionamentos M:N nem listagem paginada. Ganharíamos FK real (integridade pelo
  banco) ao custo de ~6 arquivos por camada. O trade-off não compensou para o volume pessoal.
- **Grifo guardando o hex/nome da cor diretamente** (sem id). Rejeitada: renomear/recolorir
  uma cor exigiria varrer e reescrever todos os grifos, ou eles ficariam dessincronizados.

## Consequências

- (+) Zero migração de tabela nova além de uma coluna `JSONB` em `Settings`; a feature toda
  encosta em poucos arquivos.
- (+) `Highlight.colorId` estável: renomear/recolorir é instantâneo e retroativo, sem tocar
  nos grifos.
- (+) A regra "não remover cor em uso" é testada por usecase (fake), igual ao resto do
  domínio.
- (−) Sem FK no banco entre grifo e cor: a integridade depende do usecase (validação de
  `colorId` na criação/edição do grifo e bloqueio na remoção da cor). Se um dia a paleta
  crescer ou precisar de consultas relacionais, vira entidade própria — o `colorId` estável
  facilita essa migração futura.
- A paleta é lida pelo endpoint dedicado `GET /settings/highlight-colors` (não pelo corpo de
  `GET /settings`), mantendo o schema de Settings — e o formulário de Settings que o valida —
  desacoplado da paleta.
