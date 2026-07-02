# ANALISE-E-PLANO-MELHORIA.md — Análise geral + Plano de melhoria (jul/2026)

> Documento **vivo, de análise e design**. Nasce do pedido do dono (jul/2026): (a) IA que
> ajude na **compreensão de leitura** em dois modos — Free (copiar prompt) e pago (chave
> API, automático) — **no web E no mobile**; (b) evoluir rumo a um "Notion/Obsidian 100%
> focado em produtividade/estudo"; (c) a visão "segundo cérebro" de verdade: *pesquisar
> qualquer assunto e ver o que eu já estudei sobre ele*; (d) preservar devocional,
> reflexão e captura rápida; (e) um **guia de utilização** (→ `docs/GUIA-DE-USO.md`).
>
> Mesmo ritual dos outros docs: aqui mora o racional; a sequência vive no
> `docs/BACKLOG.md` (Blocos **Q–X**, tasks **75–102**) e as specs em `docs/tasks/`,
> detalhadas **uma por vez** quando a task se aproxima.

---

## 1. Análise — estado real do app

### 1.1 O que já existe (e é mais do que parece)

O app ("Ghost Brain") está com MVP 1, MVP 2 e os Blocos N/O/P **completos**:

- **Núcleo**: Capture (inbox com fila offline no mobile), Note (TipTap: devocional,
  reflexão, fichamento, nota), Resource (biblioteca + grifos com paleta), Goal/Event
  (objetivos com progresso calculado), agenda do dia, fechar o dia, calendário,
  recaps, labels, busca simples, login JWT, settings, exclusão em duas etapas
  (ADR 0004), tema verde-estudo (ADR 0002).
- **Leitura retentiva (Bloco N)**: StudyItem + Recall, perguntas antes/durante/depois,
  fichamento de memória em duas fases, escada fixa 2d → 7d → 30d na agenda,
  metacognição A/B/C, consolidação após 3 recalls.
- **Publicações (Bloco O)**: pipeline ideia → rascunho → publicado, 5 formatos,
  gatilho-convite a partir de fichamento/recap.
- **IA prompt-first (Bloco P)**: `PromptBuilder` puro em `shared/` (4 skills:
  `study.questions`, `study.fichamento_feedback`, `study.quiz`, `publish.draft`;
  templates pt/en com a moldura do §9), porta `AiRunner` com `CopyPasteRunner`
  (modo cheap) e `AnthropicRunner` (modo conectado, `POST /ai/run`, chave só no
  `.env`). Toda saída é **candidato** → só grava com confirmação.
- **Grafo de conhecimento**: menção `@` no editor, `NoteLink` materializado (ADR 0001),
  backlinks e grafo visual no web.
- **Testes**: 161 arquivos (backend 118, mobile 24, web 18, shared 1).

**Conclusão central da análise: os dois modos de IA que o dono pediu JÁ EXISTEM.**
O que falta não é criar a IA — é dar **alcance** (mais skills de compreensão),
**paridade** (mesmas superfícies no web e no mobile) e **profundidade**
(a busca semântica que transforma o app num segundo cérebro consultável).

### 1.2 As lacunas (por ordem de gravidade)

1. **Fundação de confiança** (de `docs/AJUSTES-MVP2.md`, confirmado no código):
   - 🔴 Fuso inconsistente, dos dois lados: o **calendário** calcula "este mês" e o
     destaque de "hoje" no **fuso do dispositivo** (`calendar-grid.ts` no web,
     `CalendarPage` no mobile usam `DateTime.local()`/`new Date()`); já o dia da
     agenda/revisões devidas é resolvido no backend com `Settings.timezone`, **mas
     com fallback `UTC`** (`build-today-agenda.ts`) divergente do fallback
     `America/Sao_Paulo` dos demais usecases. E há três noções de "início de semana"
     coexistindo.
   - 🟠 JWT **sem expiração** (`sign({sub})` sem `expiresIn`); rotas `:id` sem checagem
     de dono em alguns usecases (gaps confirmados: `archive-capture.ts`,
     `archive-note.ts`, `archive-label.ts`).
   - 🟡 Capturas não são editáveis (não existe UPDATE de Capture em lugar nenhum).
     **No mobile**, arquivar Resource não tem UI e restaurar só existe em Goal —
     no web o ADR 0004 já cobriu arquivar/restaurar/excluir em todas as entidades.
2. **Assimetria das superfícies de IA**:
   - Web: hub `AssistantTab` completo, mas **nenhuma IA inline** nas telas.
   - Mobile: `PromptSheet` inline (StudyItemForm → questions; StudyItemsPage → quiz +
     feedback; PublicationsPage → draft), mas o hub `AssistantPage` é placeholder
     "coming soon".
3. **Busca**: `SearchAll` é substring case-insensitive **em memória** (paliativo
   declarado da task 51). Sem tsvector, sem embeddings. O "o que já estudei sobre X"
   não existe.
4. **Práticas 4/5/9/10 do PDF** (intercalação, mapas de diferença, interferência,
   sono) sem nenhuma feature — só as 6 primeiras viraram produto.
5. **Onboarding**: tour driver.js só no web (ADR 0003); o mobile — o app principal —
   não tem nenhum; não existia guia de uso (→ agora existe: `docs/GUIA-DE-USO.md`).
6. Miudezas: `devotionalTime`/`reflectionTime` não fazem nada; `ANTHROPIC_API_KEY` e
   `JWT_SECRET` não estão no `.env.example`; modelo Anthropic hardcoded
   (`claude-opus-4-8` em `anthropic-runner.ts`).

### 1.3 O PDF × o produto (mapa de cobertura)

| Prática (PDF) | Feature | Status |
| --- | --- | --- |
| 1. Recuperação ativa | Fichamento de memória (fase "sem olhar") | ✅ Bloco N |
| 2. Perguntas antes/durante/depois | `StudyItem.questions` + skill `study.questions` | ✅ Bloco N/P |
| 3. Revisões espaçadas | Escada 2d/7d/30d na agenda | ✅ Bloco N |
| 4. Intercalar autores | — | ❌ → task 91 |
| 5. Mapas de diferença | — | ❌ → tasks 79/89/90 |
| 6. Fichamento bruto primeiro | Duas fases (escrever → comparar) + `study.fichamento_feedback` | ✅ Bloco N/P |
| 7. Metacognição A/B/C | `Recall.confidence` + destaque do que sabe menos | ✅ Bloco N |
| 8. Contexto episódico | Prompts fixos na tela de revisão | ✅ Bloco N |
| 9. Reduzir interferência | — | ❌ → tasks 89/90 |
| 10. Sono | — | ❌ → task 92 |

---

## 2. Pesquisa de mercado (síntese)

### 2.1 Paisagem PKM 2025/2026 — o vocabulário comum

Padrões transversais de Notion/Obsidian/Tana/Capacities/Reflect/Heptabase/Logseq/
RemNote: **wikilinks `[[...]]` + backlinks**, graph view, daily notes como hub,
templates por tipo de nota, databases/objetos tipados, transclusão, **quick
switcher/Cmd+K**. O Ghost Brain já tem: backlinks/grafo (web), paleta de comandos e
quick switcher (web), menção `@`. Faltam de alto ROI para **estudo pessoal**:
wikilink `[[` com autocomplete, templates de nota, backlinks no mobile.

### 2.2 IA para compreensão de leitura — o padrão vencedor

Pesquisa recente mostra que **resumo automático de IA "achata" a retenção** (aprende
mais rápido, retém menos). O padrão que funciona — e que **valida o design atual do
app** — é: **o usuário produz (fichamento/resumo) → a IA questiona (socrático/quiz)
→ a IA compara com a fonte e aponta lacunas.** Nunca "IA resume por você".

Referências operacionais: Readwise Ghostreader (definir termos, ELI5, Q&A ancorado no
documento), RemNote (flashcards gerados por IA dentro da nota, com contexto), Quizlet
Q-Chat (tutor socrático). Daí as novas skills propostas: `study.explain`,
`study.socratic`, `study.difference_map`.

### 2.3 BYOK e o modo "copiar prompt"

O padrão recomendado para chave de API é exatamente o que o app já faz: **proxy no
backend, chave nunca no browser** (decisão do dono: continua no `.env`). Chamar a
Anthropic direto do frontend expõe a chave nas requisições — não fazer.

"Gerar prompt para colar no ChatGPT" existe como produto genérico (Promptimize, Junia,
DocsBot), mas **nenhum monta o prompt recheado com o contexto das notas do próprio
usuário**. O modo cheap do Ghost Brain + RAG (task 87) = um diferencial real de
mercado: *"copie este prompt que já contém os 12 trechos mais relevantes do que você
estudou"*.

### 2.4 RAG sobre notas pessoais ("ask your second brain")

Como fazem Notion AI Q&A (semântica + citações inline), Obsidian Smart Connections
(embeddings locais), Khoj (open-source: sentence-transformers + pgvector, top-k como
contexto). Padrões técnicos que o plano adota:

- **Busca híbrida**: BM25 (tsvector) + vetor (pgvector) fundidos com **RRF** —
  recall muito superior a vetor puro em queries com nomes próprios.
- **Contextual Retrieval** (Anthropic): prefixar cada chunk com contexto
  ("[Recurso > Nota > seção]") reduz falhas de retrieval em ~49% (67% com reranking).
- **Citações**: resposta sempre com `[n]` clicável de volta à fonte.
- **Embeddings**: a Anthropic **não tem** modelo de embeddings (e a Voyage AI é da
  MongoDB, não da Anthropic). Opções: OpenAI `text-embedding-3-small` (~US$0,02/1M
  tokens, 1536 dims) ou modelo local via Ollama (100% privado, zero custo).

### 2.5 Fontes principais

- Anthropic — Contextual Retrieval: <https://www.anthropic.com/engineering/contextual-retrieval>
- Busca híbrida BM25 + pgvector + RRF: <https://dev.to/gabrielanhaia/hybrid-search-in-100-lines-bm25-pgvector-with-rrf-merge-58cn>
- RAG self-hosted com Postgres/pgvector (2026): <https://www.digitalapplied.com/blog/build-self-hosted-rag-postgres-pgvector-tutorial-2026>
- Readwise Ghostreader: <https://docs.readwise.io/reader/guides/ghostreader/overview>
- RemNote AI flashcards: <https://www.remnote.com/ai_create_cards>
- "AI summaries flatten understanding": <https://dig.watch/updates/study-finds-ai-summaries-can-flatten-understanding-compared-with-reading-sources>
- Khoj (open-source second brain): <https://github.com/khoj-ai/khoj>
- TipTap Mention/Suggestion (wikilinks): <https://tiptap.dev/docs/editor/api/utilities/suggestion>
- Notion Q&A: <https://www.notion.com/help/guides/understanding-how-q-and-a-finds-answers-can-help-you-get-better-results>
- MongoDB adquire Voyage AI: <https://www.prnewswire.com/news-releases/mongodb-announces-acquisition-of-voyage-ai-to-enable-organizations-to-build-trustworthy-ai-applications-302382979.html>

---

## 3. Princípios que o plano respeita (inegociáveis)

- **Anti-culpa**: toda cobrança é convite; métricas nunca em tom de falha.
- **§9**: IA é espelho, não piloto; toda saída é candidato; nada grava sem confirmação;
  nunca decide o espiritual/devocional.
- **Prompt-first**: toda skill nova nasce nos **dois modos** (cheap e conectado),
  com os **mesmos templates** pt/en no `PromptBuilder`.
- **Chave só no `.env` do servidor** (decisão do dono, jul/2026).
- **TDD outside-in**: domínio → repo/rota → tela; fakes em memória; migrations só via
  Prisma; código EN / conteúdo PT / i18n.
- **Progresso calculado, log imutável, Luxon + timezone do Settings.**

---

## 4. O plano — Blocos Q–X (tasks 75–102)

> Status e checklist vivem no `docs/BACKLOG.md`. Tamanhos: P (pequeno), M (médio),
> G (grande). Specs detalhadas uma por vez, quando a task chegar.

### Bloco Q — Fundação de confiança

*Objetivo: consertar o que corrói silenciosamente a confiança antes de ampliar a superfície.*

- **75 — Fuso unificado (M).** Helper puro `todayISO(timezone, now?)` em `shared/`
  (Luxon). No front: o **calendário** passa a calcular "este mês"/"hoje" com o
  `Settings.timezone` (substituir `DateTime.local()` em
  `packages/web/src/calendar/calendar-grid.ts` e `new Date()` em
  `packages/mobile/src/pages/CalendarPage.tsx`). No back: unificar o fallback de
  timezone (`build-today-agenda.ts` usa `UTC`; os demais, `America/Sao_Paulo`) e
  escolher UMA noção de início de semana. Aproveitar para adicionar
  `ANTHROPIC_API_KEY` e `JWT_SECRET` (comentados) ao `.env.example`.
- **76 — JWT com expiração (P/M).** `sign({sub}, {expiresIn: '15d'})` + rota
  `POST /auth/refresh` (sliding: token válido devolve token novo); front renova no
  boot/401 único; logout limpo nas duas plataformas.
- **77 — Ownership nas rotas `:id` (M).** Padrão já dominante
  (`existing.userId !== input.userId → NotFound`); corrigir os gaps
  (`archive-capture/note/label` + auditar irmãos) + teste de integração "intruder"
  (modelo em `goal-routes.integration.test.ts`).
- **78 — Simetria de CRUD (P/M).** Capturas editáveis (hoje não há UPDATE de
  Capture) + **paridade do mobile** com o ADR 0004: arquivar Resource e
  restaurar/desarquivar as demais entidades pela UI mobile (o web e o backend já
  cobrem tudo; no mobile só Goal tem restaurar).

### Bloco R — IA de compreensão expandida

*Objetivo: cobrir o padrão "usuário produz → IA questiona → IA compara" com skills novas, nos dois modos.*

- **79 — Skills novas no `PromptBuilder` (M).** Puro, TDD, pt/en, moldura §9:
  - `study.explain` — `{excerpt, resourceTitle?, level: 'eli5'|'technical'}`: definir
    termos e explicar um trecho colado/grifado, ancorado no trecho (nunca resumo do
    material inteiro).
  - `study.socratic` — `{title, fichamentoText}`: tutor que **só pergunta**, escalando
    profundidade sobre o fichamento.
  - `study.difference_map` — `{topic, sources: [{resourceTitle, author?, fichamentoText}]}`
    (mín. 2): divergência real × vocabulário; por autor: tese distintiva, texto-chave,
    ponto fraco (Práticas 4/5/9 em versão-prompt).
  - Junto: modelo do `AnthropicRunner` configurável via env `ANTHROPIC_MODEL`
    (default o atual `claude-opus-4-8`).
- **80 — Descritores de skill no `shared` (P).** Mover
  `packages/web/src/assistant/assistant-skills.ts` (é 100% puro) para
  `packages/shared/src/assistant/skill-forms.ts` e cobrir as 7 skills; web importa
  de lá.
- **81 — Superfícies das skills novas (M).** Mobile (PromptSheet em
  StudyItemForm/StudyItemsPage/HighlightsSection) e web (AssistantTab), dois modos.
  Junto: corrigir o rótulo `settings.ai.mode.connected` — ainda diz "Conectado
  (em breve)" nos locales, mas o modo já funciona.

### Bloco S — Paridade de superfícies de IA

*Objetivo: as mesmas capacidades de IA em qualquer tela, nas duas plataformas.*

- **82 — Hub Assistente no mobile (M).** `AssistantPage` real (mata o "coming soon"),
  renderizando os descritores do shared (80) + `PromptSheet` existente; 7 skills,
  dois modos.
- **83 — IA inline no web (M).** Mover `PromptSheet.tsx` do mobile para
  `packages/ui/` (só depende de BottomSheet/Button/i18n/client — sem nada
  mobile-specific) e ligar nas telas web de estudo e publicação, como no mobile.

### Bloco T — "Perguntar ao meu segundo cérebro" (MVP 4 redesenhado)

*Objetivo: perguntar qualquer assunto e receber o que EU já estudei, com citações — versão grátis e conectada. Fatiado para entregar valor antes de gastar com embeddings.*

- **84 — Migração `SearchChunk` + decisão de embeddings (M).** Tabela única
  polimórfica leve (padrão `Publication.sourceType/sourceId`):
  `{userId, sourceType, sourceId, chunkIndex, content, contextText, contentHash,
  embedding vector(1536) NULLABLE, embeddingModel?}` + `@@unique([sourceType,
  sourceId, chunkIndex])`. tsvector via **índice de expressão GIN**
  (`to_tsvector('portuguese', content)`), não coluna. Fontes indexadas: `Note.plainText`
  (ACTIVE), `Capture.text` (PENDING), `Resource` (título/autor/descrição),
  `StudyItem` (título/perguntas), `Highlight` (quote/comment).
  Porta `EmbeddingProvider` (`embed(texts) → number[][]`, `model`, `dimensions`) com
  `EMBEDDING_PROVIDER=openai|ollama|none` — **recomendação: OpenAI
  `text-embedding-3-small`** (`OPENAI_API_KEY` no `.env`, mesma regra da Anthropic);
  `none` = degradação graciosa para BM25 puro; Ollama documentado como opção 100%
  local. Formalizar em **ADR** ao iniciar o bloco (junto com a exceção de migration —
  ver §6).
- **85 — Pipeline de indexação (G).** `chunkTiptapDoc(doc)` **puro em `shared/`**
  (por bloco de nível superior agrupado por heading, ~200–400 tokens, testável com
  fixtures) + Contextual Retrieval com **prefixo determinístico**
  (`"[{resourceTitle} > {noteTitle} > {heading}] "` — zero custo, mantém paridade
  cheap/conectado) + reindexação incremental: usecases de save chamam
  `ReindexSource` (fire-and-forget, pula chunks com `contentHash` inalterado) +
  botão "Reindexar tudo" no Settings.
- **86 — Busca híbrida (M/G).** Porta `SearchIndexRepository`
  (`lexicalSearch`/`vectorSearch`/`upsertChunks`/`deleteBySource`, sempre filtrando
  `userId`); fusão **RRF (k=60)** no usecase (puro, TDD com fake). **v1 = só lexical**
  (`websearch_to_tsquery('portuguese', …)` + `ts_rank`) — funciona sem chave e sem
  custo desde o dia 1, e **substitui o `SearchAll` substring** por baixo da mesma
  tela de busca. v2 liga o vetor sem tocar tela nem usecase.
- **87 — Skill `brain.ask` (M).** Contexto
  `{question, chunks: [{n, sourceType, sourceId, sourceTitle, excerpt}]}`; template
  instrui "responda SÓ com base nos trechos; cite como [n]". Usecase `AskBrain`
  (retrieve top-k≈12 → monta contexto → `RunAiSkill`) + rota `POST /ai/ask`.
  **Modo cheap devolve o prompt recheado + as citações** (o diferencial de mercado);
  conectado devolve `{text, citations}`. Resposta **não é persistida** (§9) —
  "salvar como nota" reusa o fluxo de candidato.
- **88 — Tela "Perguntar ao cérebro" (M/G).** Web e mobile: pergunta → resposta com
  `[n]` clicáveis → abre a nota/fichamento/recurso fonte.

### Bloco U — Comparação, interferência e sono (Práticas 4/5/9/10)

- **89 — Domínio `DifferenceMap` (G).** Nota estruturada ligada a N `Resource`/autores
  sobre um tema; por autor: tese distintiva, texto-chave, ponto fraco, diferença.
  Migração + UseCases + rota (TDD).
- **90 — Telas do mapa de diferença (M).** Web + mobile; a skill
  `study.difference_map` (79) passa a ser pré-preenchida com o dado real do mapa.
- **91 — Intercalação na agenda (P/M).** Dica-convite quando há 2+ recursos ativos do
  mesmo tema/label: "que tal alternar?" (Prática 4; nunca cobrança).
- **92 — Sono (P).** Marcar material como "decisivo" + nudge leve para lê-lo num bloco
  que permita dormir bem — dá função real ao `devotionalTime`/`reflectionTime`
  (hoje mortos) ou os substitui por um campo de "janela de estudo".

### Bloco V — PKM de estudo (Notion/Obsidian de alto ROI)

- **93 — Wikilink `[[` com autocomplete (M).** `Mention.extend({name: 'wikilink'})`
  reusando o `render`/`NoteSearch`/`MentionList` da menção `@` (extrair o bloco de
  render compartilhado de `note-mention.ts`); o extrator do `NoteLink` (ADR 0001)
  passa a aceitar `type IN ('mention','wikilink')`. Engorda backlinks/grafo e melhora
  o contexto recuperável do Bloco T.
- **94 — Templates de nota por tipo (M).** Fichamento 2 fases, mapa de diferença,
  devocional, ideia de publicação — no menu de criação.
- **95 — Conexões no mobile (M).** Painel de backlinks/links da nota (paridade com o
  RightPanel do web). **Grafo visual no mobile: cortado** (baixo ROI em tela pequena;
  reavaliar depois).
- **96 — "Nota do dia" como atalho na Agenda (P/M).** A Agenda JÁ é o hub diário —
  não criar daily note paralela; só acesso rápido ao diário do dia.
  **Transclusão: cortada** (registrada como futuro).

### Bloco W — MVP 3: métricas anti-culpa + recap assistido

- **97 — Agregadores calculados (M/G).** Puros, TDD pesado: constância por período,
  aderência de hábitos, recalls feitos × devidos, distribuição A/B/C. **Sem streak
  punitivo**; comparação período-a-período em tom neutro (a decisão de enquadramento
  do plano §8 se fecha aqui).
- **98 — Tela "Evolução" (M).** Web + mobile (usa o fuso da 75).
- **99 — Skill `recap.auto` (M).** Candidato de recapitulação semanal/mensal montado
  dos dados do período (notas/eventos/recalls); dois modos; confirmação vira nota
  de recap.

### Bloco X — Guia + onboarding in-app

- **100 — Guia de uso (M).** ✅ **Entregue nesta sessão** → `docs/GUIA-DE-USO.md`.
- **101 — Tour de onboarding no mobile (M).** O app principal não tem nenhum
  (ADR 0003 é só web); cobrir o ciclo capturar → revisar → fechar o dia.
- **102 — Empty states ensinantes (P/M).** Cada tela vazia explica o ritual e aponta
  o próximo passo. Registrados como ideias irmãs (sem task por ora): links "?"
  contextuais para âncoras do guia; seção "Ajuda" que renderiza o guia in-app;
  checklist de primeira semana em tom de convite.

---

## 5. Ordem e justificativa (custo/benefício)

1. **Q primeiro** — barato (4 tasks P/M) e o bug 🔴 de fuso corrompe o coração do app
   (revisões "devidas hoje"); segurança (JWT/ownership) antes de multiplicar rotas e
   superfícies.
2. **R e S em seguida** — a melhor razão valor/custo do roadmap: a infraestrutura do
   Bloco P está pronta, então skills novas são templates puros com TDD e a paridade é
   majoritariamente **reuso** (mover descritores/PromptSheet para shared/ui). Fecha
   por completo o pedido (a) do dono.
3. **T depois** — é o pedido (c) e o maior diferencial, mas o bloco mais caro.
   Fatiado para valer cedo: a v1 lexical (86) já melhora a busca de todo mundo sem
   chave nem custo; embeddings entram por uma porta isolada quando quiser.
4. **U depois de R** — as práticas 4/5/9 já terão versão-prompt (79); a
   materialização como dado (`DifferenceMap`) pode esperar o "perguntar ao cérebro".
5. **V, W, X fecham** — wikilinks/templates rendem mais quando já há massa de conteúdo
   interligável; métricas precisam de dados acumulados e de design anti-culpa
   cuidadoso; onboarding documenta superfícies já estáveis.

---

## 6. Decisões técnicas registradas (viram ADR quando o bloco chegar)

- **Embedding provider** (Bloco T): porta `EmbeddingProvider` +
  `EMBEDDING_PROVIDER=openai|ollama|none`; recomendação OpenAI
  `text-embedding-3-small`; BM25-only sem chave; dimensão `vector(1536)` casa com o
  provider recomendado — troca de provider = re-embed em massa via script
  (`embeddingModel` registra qual gerou cada vetor).
- **pgvector × regra de migrations** (Bloco T): `docker-compose` troca `postgres:16`
  → `pgvector/pgvector:pg16` (drop-in, mesmo volume). `CREATE EXTENSION vector` e
  índices HNSW/GIN não são expressáveis no schema Prisma → **exceção controlada**:
  migration dedicada **só-SQL** criada via `prisma migrate dev --create-only`
  (nunca editar SQL *gerado* pelo Prisma), revisada e testada por integração.
  Formalizar em ADR próprio.
- **Streaming no modo conectado: ADIADO.** Quebra a paridade com o modo cheap e o
  fluxo §9 (candidato → revisar → confirmar) já exige esperar o texto completo.
  A porta `AiRunner` fica preparada para um callback opcional se um dia doer.
- **Grafo no mobile: cortado** (tela pequena, baixo ROI). **Transclusão: cortada**
  (futuro). **FSRS**: a escada fixa 2/7/30 fica; FSRS registrado como evolução
  possível (A/B/C viraria o grade do algoritmo) — não é prioridade.
- **Modelo Anthropic**: sair do hardcoded para `ANTHROPIC_MODEL` no `.env`
  (default `claude-opus-4-8`) — entra na task 79.

---

## 7. O que este plano NÃO faz (fora de escopo, já registrado em outros docs)

- Upload/anexos + OCR de manuscrito (decisão disco vs S3 pendente — HANDOFF §7).
- WhatsApp/Telegram, interligação automática, agente proativo (MVP 5).
- Offline Nível 2 (resolução de conflito).
- F1 (remover `Label.parentId`) e demais dívidas listadas em `docs/MELHORIAS.md` —
  continuam válidas lá, podem ser intercaladas como tasks avulsas.
