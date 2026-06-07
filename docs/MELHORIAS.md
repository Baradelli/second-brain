# MELHORIAS.md — Roadmap de melhorias (pós-MVP 2)

> Documento **vivo e de discussão**. Reúne as melhorias pedidas pelo dono + sugestões que
> surgiram da análise do código. **Nada aqui é tarefa ainda.** Vamos discutir **bloco a bloco**;
> quando um bloco estiver fechado, geramos as specs em `docs/tasks/` (mesmo ritual do MVP 2:
> domínio testado → repo → rota → tela, uma tarefa por vez).
>
> Cada bloco traz: **Dor** (o que se sente falta) · **Estado atual** (o que já existe no código) ·
> **Proposta** · **Perguntas para decidir** · **Tarefas candidatas** · **Back/Front + esforço**
> (S/M/G).
>
> Relação com o roadmap: estas são melhorias de **UX/feature**, não necessariamente o "MVP 3 =
> métricas" do HANDOFF. Algumas encostam em MVP 3/4 — anotado onde acontece.

## Legenda

`[ ]` a discutir · `[~]` em discussão · `[x]` fechado (specs geradas) · esforço: **S** pequeno ·
**M** médio · **G** grande.

---

## Visão de produto — referência Notion / Obsidian (pesquisa jun/2026)

O dono quer o app **mais robusto, "tipo Notion"**: editor de blocos rico, **calendário com metas
reais** e uma **biblioteca de verdade** (clicar num item → ver todas as notas referenciadas a ele).

**Por que Notion e não Obsidian (resumo da pesquisa).**

- **Notion** = "tudo é bloco": cada parágrafo/título/lista/tabela é um bloco que se **arrasta,
  reordena, transforma e aninha**, com **menu "/"** para inserir qualquer coisa. Rico
  _out-of-the-box_, ótimo no mobile, baixa curva.
- **Obsidian** = uma página é um **arquivo Markdown**; o "WYSIWYG" (Live Preview) e quase tudo
  de rico depende de **plugins que você instala** — daí a sensação (correta) de que "precisa
  instalar coisas". Ponto forte dele: **dono do dado** (arquivos locais, zero lock-in).
- Trade-off clássico: **Notion** é mais completo e fluido, mas o dado vive na nuvem deles e o
  export "não é 100% fiel"; **Obsidian** é portável mas cru.

**Direção para o nosso app.** Mirar a **experiência do Notion** (editor de blocos + biblioteca

- calendário), mas **mantendo nós donos do dado** (já guardamos o doc como JSON do TipTap no
  nosso Postgres). Como _hedge_ contra lock-in (a crítica ao Notion), vale ter **export `.md`** no
  radar (já listado no HANDOFF §7).

**Boa notícia técnica (muda o custo do editor).** Nosso editor já é o **TipTap**. Em 2025 o
Tiptap **abriu o código (MIT)** de 10 extensões antes pagas — incluindo **DragHandle**,
**Details/toggle**, **TableOfContents**, **UniqueID**, Emoji, Mathematics. Somadas às já
gratuitas (Highlight, Table, TaskList, Image, Link, menu "/" via _suggestion_, bubble menu), dá
para construir um editor **bem "Notion"** **só com peças gratuitas**. **Pago** só: colaboração em
tempo real, IA, e o template pronto — **nada disso é necessário** para o que o dono pediu.

> Fontes no apêndice. Conclusão: o "editor tipo Notion" é **viável no nosso stack sem custo de
> licença** — é trabalho de frontend, não de comprar produto.

---

## Bloco A — Labels (taxonomia que atravessa o app) — **[x] FECHADO** (exceto A6, futuro)

> **Decisão revista (jun/2026): labels são PLANAS, sem hierarquia.** O dono observou que, se um
> item já pode ter **muitas labels** (N–N), a **árvore** vira complexidade sem ganho. Então:
> **cascata/rollup cai**, profundidade não se aplica. A UI já age como plana (sem pai/sub-label;
> `LabelForm`/`LabelsPage` planos). `Label.parentId` continua no banco por ora (inofensivo) e
> será **removido numa migração futura** (nova tarefa A6, abaixo), junto com o código de árvore
> no backend (`list-label-tree` → lista plana, tirar reparent/ciclo). O filtro (A4) é **simples**
> ("item tem esta label"), sem rollup.

**Dor.** "Não tem uma área onde eu crio a label, marco nos itens, e depois filtro por ela."
Hoje labels são invisíveis no app, apesar de existirem no banco.

**Estado atual (já pronto no backend).**

- `Label` tem `name`, **`parentId` (árvore/cascata)**, `color`, `status`, `archivedAt`.
- Vínculo **N–N** já existe com `Capture`, `Note`, `Resource`, `Goal`.
- Rotas: `POST /labels` (cria, com `parentId`), `GET /labels` (árvore, ativos),
  `POST /labels/:id/archive` (bloqueia se em uso ou com filhos ativos).
- `GuideQuestion` (perguntas-guia) já se prende a label.
- **Falta no backend:** `editLabel` (renomear / trocar cor / mover de pai); contagem de uso por
  label (opcional); **filtro com rollup de subárvore** (filtrar por um pai e incluir itens dos
  filhos — listado como decisão aberta no HANDOFF §7).
- **Falta no frontend (quase tudo):** tela de gerenciar labels (criar/editar/arquivar, ver a
  árvore); **seletor de labels** nos formulários (captura, recurso, objetivo, nota — hoje
  nenhum deixa marcar label pela UI); **filtro por label** nas listas.

**Proposta.**

1. **Tela "Labels"** (gerenciar): árvore com expandir/recolher, criar label (com pai opcional →
   cascata), editar nome/cor, arquivar. Cor vira a identidade visual usada nos chips.
2. **Seletor de labels reutilizável** (componente) plugado nos formulários de criação/edição de
   Resource, Goal, Note e na captura/promę. Aplica/desaplica labels (a API N–N já aceita).
3. **Filtro por label** nas listas (Biblioteca, Notas, Objetivos), idealmente com **rollup**
   (escolher "Livros" traz também "Livros › Técnicos").

**Perguntas para decidir.**

- **Rollup de subárvore**: filtrar por um pai inclui os filhos? (Recomendo **sim** — é o sentido
  de "cascata".) Onde resolver: no app (buscar a subárvore e mandar vários `labelId`) ou no
  backend (CTE recursiva / endpoint que expande)?
- **Cores**: paleta fixa (ex.: 8 cores) ou cor livre? (Fixa é mais simples e bonita.)
- **Profundidade da árvore**: limitamos a 2 níveis (pai → filho) ou livre? (No `Goal` limitamos
  UMBRELLA a 1 nível; em labels o banco permite N níveis.)
- **Onde mora a tela de Labels** na navegação? (Settings? Dentro da Biblioteca? Aba?)
- Editar label que está em uso recolore os chips em todo lugar — ok? (Sim, é o esperado.)

**Tarefas candidatas.**

- A1. `editLabel` (UseCase + rota): renomear, cor, re-parent (com guarda de ciclo). **Back · S/M**
  — **[x] feito** (`tasks/43-back-editar-label.md`).
- A2. (Se rollup no back) endpoint/serviço que expande subárvore para filtro. **Back · M**
- A3. Componente `LabelPicker` (seleciona da árvore) + i18n. **Front · M**
  — **[x] feito** (`LabelPicker` + aplicado em `ResourceForm`/`GoalForm`).
- A4. Tela "Labels" (CRUD + árvore). **Front · M** — **[x] feito** (`LabelsPage`, via ícone no header).
- A5. Plugar `LabelPicker` nos forms (Resource, Goal, Note, Captura/promote). **Front · M**
  — **[x] feito**: Resource, Goal e **Nota (editor)**. **Captura: fora de escopo de
  propósito** (princípio "captura sem atrito" — labels entram na edição/promoção).
- A3b. Labels no editor de nota + filtro por label nas Notas. **Front · M** — **[x] feito**
  (botão "Labels" no editor persiste via `editNote(labelIds)`; `LabelFilter` na `NotesPage`).
- A4. Filtro por label (simples, sem rollup) nas listas. **Front · M** — **[x] feito**
  (`LabelFilter` client-side em Biblioteca e Objetivos; Notas depende de A3b).
- **A6 — Remover a árvore do schema** → movido para **Melhorias futuras (F1)** no fim do arquivo. _futuro_

**Dependências.** É **pré-requisito** do filtro por label do Bloco B. Bom começar por aqui.

---

## Bloco B — Biblioteca **de verdade** (recurso → notas referenciadas) + filtros — **[x] FECHADO**

**Dor (o centro do pedido).** "Uma biblioteca tem que ser realmente uma biblioteca: quando eu
clico em algo, já aparecem **todas as notas referenciadas a ele** — é o que eu preciso." Mais:
filtros melhores, ordenar por tipo, e status **genérico** (o "Lendo" não serve pra um curso).

**Estado atual.**

- A `LibraryPage` **lista e cria** recursos e cicla o `stage`. Tocar num recurso **não faz nada**
  (não há tela de detalhe).
- A `Note` **já guarda `resourceId`** (o fichamento criado no fluxo de Notas já nasce ligado ao
  recurso). Mas **nada exibe** essa ligação, e o `listNotes` **ainda não filtra por `resourceId`**
  (o filtro existe para `type`/`status`, falta `resourceId` no `NoteFilter`/rota).
- `Resource.stage` ∈ `backlog|in_progress|done`, rótulo "Quero ler / Lendo / Concluído".
- Filtro só por **stage**; sem tipo, sem label, sem ordenação.

**Proposta.**

1. **Tela de detalhe do recurso** (o coração): tocar num recurso abre uma página com seus dados
   (tipo, autor, link, stage, labels) **e a lista de todas as notas referenciadas** (seus
   fichamentos). Botão **"+ Novo fichamento deste recurso"** abre o editor já com `resourceId`
   preenchido — fecha o ciclo recurso↔nota.
2. **Status genérico** (mesmos 3 estágios, rótulo neutro): **"A fazer / Em andamento / Concluído"**
   — serve pra livro, curso, vídeo, podcast. (Alternativa: rótulo **por tipo** — mais bonito,
   mais i18n.)
3. **Filtro por tipo** + **ordenação** (tipo / data / título / stage).
4. **Filtro por label** (vem do Bloco A).

**Perguntas para decidir.**

- O detalhe do recurso mostra só **notas**, ou também **objetivos/capturas** ligados a ele?
  (Começar por notas, que é o pedido; o resto é incremento.)
- Status **genérico único** (recomendo) **ou** **por tipo**?
- Ordenar no **cliente** (lista pequena) ou no **backend** (`orderBy`)?

**Tarefas candidatas.**

- B0. `listNotes` aceitar `resourceId` (NoteFilter + rota + fake/contrato). **Back · S** — **[x] feito**
- B1. **Tela de detalhe do recurso** + lista de notas + "novo fichamento daqui". **Front · M** — **[x] feito**
      (`ResourceDetailPage` em `/library/:id`; `GET /resources/:id` no backend; cards clicáveis).
- B2. Status genérico (`resource.stage.*` → "A fazer / Em andamento / Concluído"). **Front · S** — **[x] feito**
- B3. Filtro por tipo + ordenação na `LibraryPage`. **Front · S/M** — **[x] feito**
      (selects de tipo + ordenação recentes/título/tipo, client-side).
- B4. Filtro por label. **[x] feito** na A4.

**Dependências.** B0/B1 (o "de verdade") são o coração e quase independentes — ótimo candidato a
começar cedo. B4 depende do Bloco A.

---

## Bloco C — Editor estilo Notion (TipTap) — **[x] FECHADO** (resta backlinks reversos, futuro)

**Dor.** "Preciso de um editor mais complexo — começando por **grifar o texto com cores** —, no
fim das contas algo **parecido com o Notion**."

**Estado atual.**

- `RichEditor` (TipTap) tem: negrito, itálico, H1/H2, citação, listas, link.
- Já **carrega** `TextStyle` + `Color` (cor de texto) — mas **sem botão**.
- **Não tem** _highlight_ (grifo com fundo), nem slash, nem arrastar, nem blocos avançados.
- `plainText` é derivado do doc; marcas (grifo/cor) **não** afetam a extração — seguro.

**O que faz o Notion ser "o editor" (pesquisa).** Tudo-é-bloco: **menu "/"** para inserir
qualquer bloco, **arrastar/reordenar**, **transformar** um bloco em outro, **aninhar**. Mais
tipos de bloco: checklist, **toggle**, callout, tabela, divisória, imagem, código.

**Viabilidade no nosso stack (importante — sem custo de licença).** Tudo que precisamos é
**gratuito (MIT)** no TipTap: Highlight, Table, TaskList, Image, Link, **DragHandle**,
**Details (toggle)**, menu "/" (via _suggestion_), bubble menu. **Pago** só Colaboração/IA/template
pronto — **não usamos**.

**Proposta (faseada — entrega valor cedo).**

- **C1 — Grifar com cores (o pedido imediato).** `@tiptap/extension-highlight` multicolor +
  botões com paleta (amarelo/verde/rosa/azul) legível nos 2 temas; opcional cor de texto. **S/M**
  — **[x] feito** (swatches na toolbar do `RichEditor` + botão "remover grifo"; cores rgba c/ alpha).
- **C2 — Sensação Notion básica.** Menu **"/"** para inserir blocos + **bubble menu** de
  formatação na seleção. **M** — **[x] feito**: bubble menu (seleção → Negrito/Itálico/grifos)
  + menu **"/"** (`SlashCommand` via `@tiptap/suggestion` + tippy: Texto/Título 1-2/Lista/
  Lista numerada/Citação, com busca e navegação por teclado).
- **C3 — Mais blocos.** Checklist (TaskList), **toggle** (Details), divisória, callout, tabela. **M/G**
  — **[x] feito**: checklist + toggle + divisória + **tabela** (insertTable 3×3) + **callout/aviso**
  (nó custom), todos via menu "/".
- **C4 — Manipular blocos.** **Arrastar/reordenar** (DragHandle) + transformar bloco. **M**
  — **[x] feito**: `DragHandle` (alça de arraste por bloco). Transformar bloco já dá pelo menu "/".
- **C5 — Links entre notas (menção `@`).** **[x] feito**: digitar `@` no editor busca notas
  (injetado via `noteSearch`) e insere uma **referência clicável** que navega pra nota
  (`onOpenNoteLink`). Forward links prontos. *Backlinks reversos* → movido para
  **Melhorias futuras (F2)** no fim do arquivo.

**Perguntas para decidir.**

- Até onde ir? (Sugiro **C1 já**; **C2+C3** trazem ~80% da sensação Notion com risco baixo.)
- Paleta de cores (quais, e como mapear em claro/escuro via CSS vars).
- **Backlinks entre notas (C5)** entram nesta trilha ou viram um bloco próprio mais à frente?
  (Tem peso de produto — é o "cérebro" interligado.)
- Manter o editor **mobile-first** (toolbar/“/” bons no toque) — confirmar.

**Dependências.** Tudo no `ui/RichEditor` (+ telas que o usam). Isolado; C1 pode ir a qualquer
momento. C5 (backlinks) toca dados (relação nota↔nota) — provavelmente um bloco à parte.

---

## Bloco D — Calendário com **metas reais** / histórico — **[x] FECHADO**

**Dor.** "Queria um visualizador em calendário **com metas reais**." (Não só notas — ver os
objetivos e o que foi cumprido em cada dia.)

**Estado atual.**

- Só existe a **Agenda de hoje**. Sem visão de mês, sem navegação por data.
- Dados existem: `Note.date`, **`Event.occurredAt`** (checks/skips de objetivos), `Goal` com
  cadência. Dá pra montar "o que estava previsto e o que foi cumprido em cada dia".
- `dayRange`/Luxon já fazem janelas por dia/semana/mês no timezone do usuário; `buildDayClosing`
  e `computeGoalProgress` já sabem o que é "pendente/feito no dia".

**Proposta.**

1. **Calendário mensal** navegável; cada dia marca: diário feito (devocional/reflexão), **nº de
   objetivos cumpridos × previstos** (metas reais, dos `Event`), notas criadas.
2. **Tocar num dia** → ver as **metas daquele dia** (cumpridas/puladas/pendentes) + as notas
   escritas, com atalho pra abrir/registrar.
3. Ponte para **recapitulações** (semana/mês — backend de recap já existe do MVP 1, sem tela).

**Perguntas para decidir.**

- O "resumo do dia" mostra o quê exatamente? (Ex.: anel de objetivos do dia + selo de diário +
  contagem de notas.) — isso define o agregador.
- **Backend**: endpoint agregador `GET /calendar?month=…` (devolve por dia: metas previstas/feitas,
  diário, nº notas) **ou** o cliente junta `listNotes` + eventos por intervalo? (Agregador é mais
  limpo e reaproveita `computeGoalProgress`.)
- **Navegação**: tela própria; entra onde? (Bom candidato a ocupar o slot do "Assistente"
  placeholder — ver E6.)
- Escopo: aqui é **navegar/visualizar**; **streaks/aderência/números** são MVP 3. (Recomendo
  manter essa linha pra não virar o MVP 3 inteiro.)

**Tarefas candidatas.**

- D1. UseCase/endpoint agregador por mês (metas previstas/feitas + selo de diário). **Back · M**
  — **[x] feito** (`tasks/44-back-calendario-mensal.md`): `buildMonthCalendar` + `GET /calendar`;
  helpers `localDayKey`/`monthDayKeys`; `calendar*Schema` em `shared/`. Decisão: notas/capturas
  ficaram **fora** do agregador (só metas previstas×cumpridas + selo devocional/reflexão).
- D2. Tela de calendário mensal + marcação por dia. **Front · M/G** — **[x] feito**
  (`tasks/45-tela-calendario-mensal.md`): `CalendarPage` (grade mensal navegável, marcação
  metas previstas×cumpridas + ponto de diário, toque no dia → resumo em BottomSheet);
  `getCalendar` no client; aba "Assistente" → **"Calendário"** na tab bar. O resumo do dia é
  leve (do dado já carregado); o detalhe rico (metas individuais + notas + ações) é a D3.
- D3. Detalhe do dia (metas + notas) → navegação/ações. **Back+Front · M** — **[x] feito**
  (`tasks/46-detalhe-do-dia.md`): agregador `buildDayDetail` + `GET /calendar/day` (metas do dia
  com status **feito/pulado/pendente** + notas do dia); `DayDetailPage` em `/calendar/:date`
  (toque no dia do calendário navega pra cá; abre nota no editor; CTA "Fechar o dia" quando é hoje
  e há pendente). Decisão: **read-only** (registrar mora no "Fechar o dia").

**Dependências.** Maior bloco. Reaproveita muito do Bloco K do MVP 2 (eventos/progresso). Encosta
no MVP 3 (métricas) — manter escopo em navegação/histórico com **metas reais**, sem streaks.

---

## Bloco F — Gerência de objetivos (editar / arquivar / restaurar / excluir) — **[x] FECHADO**

> Pedido do dono (jun/2026), **antes do Bloco E**: poder **editar** objetivos e **excluir** os
> que não vingaram. Modelo: **arquivar** (soft delete) e, numa **área de arquivados**, **restaurar**
> ou **excluir de vez** os que **nunca foram feitos em nenhum dia**. Recorta o item E4 para objetivos.

**Decisões (fechadas com o dono).**

- **Excluir (hard delete)** só quando o objetivo **não tem nenhum `done`** (nunca foi feito). Se
  tiver só `skip`, esses eventos são apagados junto (o objetivo nunca aconteceu). Objetivo **com
  histórico de `done`** → **não exclui**, só fica arquivado (respeita "Event = log imutável":
  não destruímos histórico real de cumprimento). Também não exclui se tiver **filhos** (UMBRELLA).
- **Tudo na tela de Objetivos**: tocar num objetivo abre **edição**; botão "ver arquivados"
  mostra/oculta a seção de arquivados (com **restaurar** e **excluir** quando elegível). Espelha
  o padrão das capturas.
- **Restaurar** (desarquivar) incluído.

**Estado atual.** Backend já tem `editGoal` (`PATCH /goals/:id`), `archiveGoal`
(`POST /goals/:id/archive`, bloqueia se há filho ativo) e `completeGoal`. **Faltam**: listar
arquivados, **excluir** e **desarquivar**; e no front, **nada** de editar/arquivar/arquivados.

**Tarefas.**

- F-back. `deleteGoal` (gates: arquivado + sem `done` + sem filhos → apaga skips e o goal) +
  `unarchiveGoal` + `listArchivedGoals` (com flag `deletable`); `GoalRepository.delete`; rotas
  `POST /goals/:id/delete`, `POST /goals/:id/unarchive`, `GET /goals/archived`. **Back · M** —
  `tasks/47-back-gerencia-objetivos.md`.
- F-front. Editar objetivo (toque → form preenchido, tipo travado), arquivar; seção "arquivados"
  com restaurar/excluir (confirmação). **Front · M** — **[x] feito**
  (`tasks/48-tela-gerencia-objetivos.md`). _Obs.: acesso mais direto à tela de Objetivos
  (hoje só via painel da Home) ficou fora — decisão de navegação a combinar._

---

## Bloco E — Melhorias transversais (sugestões minhas, a debater)

Itens que percebi faltando e que valem entrar na conversa:

- **E1. Aplicar/ver labels nos fluxos** — hoje nenhum formulário deixa marcar label, então o
  vínculo N–N existe mas nunca é usado pela UI. (Já coberto por A5; reforço aqui a urgência.)
- **E2. Mostrar o recurso vinculado no fichamento** — a nota já guarda `resourceId`, mas a
  lista de Notas e o editor não mostram "Fichamento · Clean Code". Precisa de `GET /resources/:id`
  ou mapear no cliente. **S/M**
- **E3. Notas de um recurso** — na Biblioteca, abrir um recurso e ver seus fichamentos. **M**
- **E4. Editar/arquivar pela UI** — hoje não dá para **arquivar** nota/recurso/objetivo nem
  **editar** um recurso (só avançar stage) pela interface. Faltam ações de gerência. **M**
- **E5. Busca simples** (texto) em notas/recursos/capturas — ganho rápido; a busca **semântica**
  é MVP 4, mas um "buscar por palavra" simples ajuda já. **M**
- **E6. Aba "Assistente"** é só placeholder (MVP 5) ocupando um slot da tab bar — pode ceder
  lugar (ex.: para Calendário ou Labels) até existir. **S** (decisão de navegação)
- **E7. Recapitulações na UI** — o backend de recap (semana/mês/ano) existe desde o MVP 1, mas
  não há tela. Combina com o Bloco D (calendário/histórico). **M**

---

## Como vamos trabalhar

1. Você escolhe um bloco (ou eu sugiro a ordem por dependência).
2. Discutimos as **"Perguntas para decidir"** daquele bloco e fechamos as decisões.
3. Eu gero as **specs em `docs/tasks/`** das tarefas do bloco (uma a uma) e executo no ritual de
   sempre (TDD no domínio, bordas no essencial, UI só nos fluxos que quebram em silêncio).
4. Fecho o bloco (marco aqui) e seguimos para o próximo.

## Ordem sugerida (por dependência, não obrigatória)

1. **Bloco A (Labels)** — destrava filtro por label e dá a taxonomia que falta.
2. **Bloco B (Biblioteca)** — parte independente (B1/B2) pode ir em paralelo/antes; B3 depende de A.
3. **Bloco C (Editor)** — isolado, entra quando quiser (ganho percebido alto, risco baixo).
4. **Bloco D (Calendário)** — maior; melhor depois, perto do MVP 3.
5. **Bloco E** — encaixar os itens nos blocos correlatos conforme a gente avança.

---

## Apêndice — relação com o roadmap de MVPs (HANDOFF)

- **MVP 3 = métricas & evolução**: streaks, aderência, comparação período-a-período. O **Bloco D**
  (calendário) é a porta de entrada visual disso, mas aqui fica só em navegação/histórico; os
  números são MVP 3.
- **MVP 4 = busca semântica** (pgvector). O **E5** (busca simples por texto) é um paliativo
  anterior, não substitui.
- **MVP 5 = agente** (o "Assistente"). Enquanto não chega, **E6** sugere liberar o slot da aba.

---

## Apêndice — Pesquisa (jun/2026): fontes

Notion (editor de blocos / slash):

- Notion — Using slash commands: https://www.notion.com/help/guides/using-slash-commands
- Notion — Block basics: https://www.notion.com/help/guides/block-basics-build-the-foundation-for-your-teams-pages

Editor "tipo Notion" no nosso stack (TipTap):

- Tiptap — Notion-like editor template (é **pago** p/ produção): https://tiptap.dev/docs/ui-components/templates/notion-like-editor
- Tiptap — **abrindo 10 extensões antes Pro sob MIT** (DragHandle, Details/toggle, TableOfContents, UniqueID, Emoji, Mathematics…): https://tiptap.dev/blog/release-notes/were-open-sourcing-more-of-tiptap
- Discussão (HN): https://news.ycombinator.com/item?id=44202103
- Tiptap — Drag Handle (MIT): https://tiptap.dev/docs/editor/extensions/functionality/drag-handle

Obsidian (markdown + plugins; Live Preview):

- Obsidian — Edit & read (Live Preview): https://obsidian.md/help/edit-and-read

Comparativos Notion × Obsidian (dono do dado, mobile, casos de uso):

- Zapier — Obsidian vs Notion: https://zapier.com/blog/obsidian-vs-notion/
- Markdown editors 2026 (Obsidian/Notion/Typora): https://text-case.com/guides/markdown-editor-comparison-guide

**Conclusões que usamos acima:** (1) a experiência "Notion" cabe no TipTap **sem custo de
licença** (só os bundles de colaboração/IA são pagos, e não precisamos deles); (2) o diferencial
do Obsidian é portabilidade do dado → manter export `.md` no radar; (3) nosso norte é a fluidez
do Notion **mantendo nós donos do dado** (TipTap JSON no nosso Postgres).

---

## Melhorias futuras (anotadas, a analisar depois)

> Itens **fechados como "futuro"** nos blocos acima, reunidos aqui pra decidirmos quando/se
> entram. **Não são tarefas ainda.**

- **F1 — Remover a árvore de labels do schema (ex-A6).** Migração tira `Label.parentId`; no
  backend `list-label-tree` → lista plana, remover reparent/guarda-de-ciclo de
  `editLabel`/`createLabel`. Hoje a UI já age como plana e o `parentId` fica inofensivo no banco;
  é **limpeza de dívida**, sem ganho visível pro usuário. **Back · M** · _origem: Bloco A_
- **F2 — Backlinks reversos no editor (ex-C5, parte 2).** Hoje temos os **forward links** (menção
  `@` → referência clicável que navega). Falta o **reverso**: num painel da nota, "quais notas
  apontam pra esta". Exige um **índice reverso** dos docs (varrer os `mention` nos docs ou manter
  uma tabela de arestas nota↔nota atualizada na gravação) + endpoint + UI. É o que torna o
  "cérebro" de fato interligado. **Back+Front · M/G** · _origem: Bloco C_
