# CONTEXT — Linguagem ubíqua do "Segundo Cérebro"

> Glossário canônico do projeto. Só termos e seus significados — sem decisões de
> implementação (essas vão em `docs/adr/`) e sem visão de produto (essa vive em
> `docs/plano-segundo-cerebro.md`). Código em inglês, conteúdo ao usuário em português.

## Domínio (conhecimento, compromisso, ritmo)

- **Capture (Captura)** — anotação rápida no inbox (texto + URL opcional). Triada na
  revisão: vira Note/Resource/Goal ou é arquivada.
- **Note (Nota)** — conteúdo rico (doc TipTap). Tipos: devocional, reflexão, nota de
  estudo, nota. Escopos: dia, semana, mês, ano.
- **Resource (Recurso)** — item da biblioteca (livro, curso, vídeo, artigo, podcast).
  Tem estágio: backlog → em progresso → concluído.
- **Goal (Objetivo)** — compromisso com tipo explícito: hábito, alvo (com medida),
  projeto (com total), guarda-chuva (objetivo-pai).
- **Event (Evento)** — log imutável de uma ação num objetivo (`done`/`skip`). Não se
  arquiva nem edita; desfazer = apagar de fato. Progresso é **calculado** a partir dele.
- **Label** — etiqueta hierárquica (árvore). Pode ter perguntas-guia.
- **StudyItem (Item de estudo)** — unidade durável de leitura retentiva, ligada a um
  Recurso e a um **fichamento** (Note). Durabilidade: ativo → arquivado → consolidado.
- **Recall** — log imutável de uma tentativa de recuperação de um StudyItem. Confiança
  **A** (sei explicar) / **B** (reconheço) / **C** (não sei).
- **Publication (Publicação)** — artefato a publicar (post/artigo/aula). Pipeline:
  ideia → rascunho → publicado.
- **Mention (Menção)** — referência de uma Note a outra, via "@" no editor (nó
  `mention` no doc). É a aresta do grafo de conhecimento.
- **Backlink** — o inverso de uma Menção: as notas que apontam para esta.

## Ritmo & rituais

- **Agenda / Hoje** — visão agregada do dia: status do ritual, capturas pendentes,
  objetivos do dia, revisões (recalls) do dia.
- **Devocional / Reflexão** — as duas Notes diárias do ritual (manhã / noite).
- **Fechar o dia** — ritual de resolver os objetivos pendentes do dia (fiz / não fiz
  porque… / deixa pra lá).
- **Recap** — síntese de um período (semana/mês/ano); uma Note de escopo maior.
- **Escada de revisão** — os intervalos fixos do recall (2 dias → 1 semana → 1 mês),
  calculados pelo backend. A confiança A/B/C é metadado de priorização, **não** muda o
  intervalo.

## Shell desktop (web, estilo Obsidian)

- **Pane (Painel)** — uma das três colunas redimensionáveis: explorador (esquerda),
  conteúdo (centro), painel contextual (direita).
- **Explorer (Explorador)** — painel esquerdo: itens fixos no topo (Hoje, Busca,
  Calendário, Assistente) + seções colapsáveis de entidades + Config no rodapé.
- **Tab (Aba)** — uma coisa aberta no painel central. Tem `kind` (today, note, goal,
  resource, studyItem, publication, review, calendar, recaps, assistant, search,
  settings, graph) e histórico back/forward próprio.
- **Command palette (Cmd/Ctrl+P)** — paleta de **ações** (abrir views, criar, alternar
  tema/idioma, sair).
- **Quick switcher (Cmd/Ctrl+O)** — busca incremental para **pular** para uma entidade.
- **Outline** — índice de cabeçalhos derivado do doc da Note ativa (efêmero).
- **Graph (Grafo)** — visão global força-dirigida: nós = Notes, arestas = Menções.

## Camadas (DDD-lite) — termos de arquitetura

- **UseCase** — a regra de negócio; não conhece Fastify nem Prisma.
- **Repository** — contrato de persistência (interface). Tem impl Prisma (produção) e
  fake em memória (testes).
- **Candidato (IA)** — resultado de uma skill de IA que **só** é salvo após confirmação
  explícita do dono. A IA é espelho, não piloto automático.
