# HANDOFF — Segundo Cérebro (contexto do projeto para continuar nos próximos MVPs)

> **Para que serve este documento:** colá-lo (ou anexá-lo) no início de uma conversa nova
> permite retomar o projeto sem perder o contexto. Ele resume o QUE é o projeto, as DECISÕES
> tomadas, o que JÁ foi construído (MVP 1) e os PRÓXIMOS PASSOS. Os documentos canônicos
> continuam sendo, no repositório: `CLAUDE.md` (regras), `docs/plano-segundo-cerebro.md`
> (plano completo), `docs/BACKLOG.md` (progresso) e `docs/tasks/*` (specs por tarefa).

---

## 1. O que é o projeto

Um **"segundo cérebro" pessoal** — um app PKM/produtividade de uso pessoal (single-user por
ora) que unifica quatro coisas num só sistema:

1. **Captura sem atrito** de ideias (inbox).
2. **Ritual diário**: devocional de manhã + reflexão à noite, mais recapitulações
   (semana/mês/ano).
3. **Base de conhecimento** (biblioteca de livros/cursos/etc.).
4. **Objetivos e agenda** com check e "fechar o dia".
   O dono é desenvolvedor backend (Node/TS), de São Paulo, com forte envolvimento em ministério
   cristão (daí devocional/reflexão/sermões serem cidadãos de primeira classe). O app é, em
   última instância, um "espelho" para pensar melhor — **nunca** um juiz que pune ausências
   (ver "princípio anti-culpa" abaixo).

---

## 2. Princípios que guiam TUDO

- **É UM sistema, não três.** Captura → revisão → vira objetivo/recurso/anotação/arquivo.
  Nada de apps separados costurados.
- **Princípio anti-culpa.** "Mapear a vida" é visão de longo prazo; o sistema **nunca** pune
  ausência de registro. Métricas e cobranças são enquadradas como conquista/convite, jamais
  como falha. Isso afeta UX, tom de texto e, no futuro, o tom do agente.
- **Progresso/streak/pendente são SEMPRE calculados**, nunca guardados.
- **Soft delete** em tudo de UI (`status` + `archivedAt`); **Event é log imutável**.
- **Datas em UTC no banco; "o dia" calculado no `timezone` do usuário** (Settings), via
  **Luxon** (nunca `new Date` para lógica de calendário).
- **Captura ≠ escrita.** Captura é textarea de texto puro; só `Note` tem editor rico (TipTap).
- **Agente é espelho, não piloto automático** (limites detalhados no plano, seção 9).

---

## 3. Stack e arquitetura (decididas e em uso)

- **Monorepo pnpm**: `packages/shared` (schemas Zod), `ui` (componentes React),
  `backend`, `web`, `mobile`.
- **Backend**: Node + TypeScript + **Fastify**; **Zod + fastify-type-provider-zod + Swagger**
  (um schema valida, tipa e documenta); **Prisma + PostgreSQL**. **Sem BFF** (o Fastify
  agrega via endpoints, ex.: `buildTodayAgenda`).
- **Frontend**: React + **Vite** (PWA), **NÃO Next** (offline-first sem SSR ocioso).
  **Tailwind** para estilo; **React Hook Form + Zod** nos formulários; **react-i18next**
  (pt default, en); **TipTap** no editor. **Mobile primeiro**; web e mobile com bases
  separadas compartilhando `shared/` e `ui/`.
- **Datas**: **Luxon**.
- **Idioma**: **código/DB em inglês**, **conteúdo de UI em português** (via i18n, chaves
  semânticas em inglês).
- **Arquitetura em camadas (DDD-lite)**: `Rota (Fastify, valida Zod) → UseCase (regra, não
conhece Fastify/Prisma) → Repository (interface + fake em memória + impl Prisma) → Prisma`.
  Entidades simples (sem value objects/agregados/eventos de domínio).
- **TDD calibrado**: TDD estrito no domínio/UseCases (cobertura alta, fake repo, sem banco);
  bordas (repo/rota) só no essencial; UI só fluxos que quebram em silêncio. Meta: **nunca ter
  medo de refatorar**. (Offline foi exceção — testado com mais rigor.)
- **Enums híbridos**: enum Prisma nos valores fechados (status, NoteType, NoteScope); `String`
  validado por `z.enum` nos que ainda evoluem (`Event.type`, `Goal.type`).

---

## 4. Como trabalhamos (processo de execução)

- Cada tarefa do `docs/BACKLOG.md` tem uma spec própria em `docs/tasks/NN-*.md` (objetivo,
  contrato, testes a escrever primeiro, arquivos a tocar, fora de escopo, definição de pronto).
- O dono executa **uma tarefa por vez** no **Claude Code**, roda os testes, sobe no git, e
  pede a próxima. Por isso **cada tarefa sai ponta a ponta** (domínio + repo + rota + testes).
- Padrão de colaboração nesta conversa: antes de cravar decisões de arquitetura, são feitas
  perguntas (trade-offs explícitos); o `plano-segundo-cerebro.md` é o documento vivo.
- **Lição aprendida (importante para o frontend):** o Claude Code acerta o funcional, mas o
  **visual a partir de spec textual sai fraco**. A correção foi: colocar imagens de
  referência no repo (`docs/design-refs/`), mandar ele OLHAR as imagens, pedir diagnóstico
  antes de corrigir, e travar "mexa só no visual, não na lógica, rode os testes". Ver
  `docs/PROMPT-refazer-visual.md`. Vale repetir esse padrão nos próximos frontends.

---

## 5. O que JÁ está construído (MVP 1 — COMPLETO ✅)

O "núcleo vivo": dá para, todo dia e no celular (inclusive offline), escrever devocional e
reflexão num editor decente, capturar ideias sem atrito, ver a agenda do dia e revisar
capturas (promover para nota ou arquivar).

**Tabelas no banco (MVP 1):** `User`, `Settings`, `Capture`, `Note`, `Label`,
`GuideQuestion`, `Attachment`. (As de MVP 2+ ainda **não** existem — ver próximos passos.)

**Funcionalidades entregues (Tarefas 01–24, todas concluídas):**

- **Note** (anotação): criar/editar, derivar `plainText` do `doc` TipTap, buscar a nota do
  dia, regra de **unicidade do diário** (um devocional/uma reflexão por período) imposta na
  aplicação, **recapitulações** (escopo WEEK/MONTH/YEAR). Rotas `/notes`.
- **Capture**: criar (com `reviewAt` padrão pelo dia de revisão), listar pendentes/arquivadas,
  arquivar (soft delete + motivo), **promover para Note** (herda labels, marca destino).
  Rotas `/captures` + ações.
- **Agenda**: `buildTodayAgenda` + `GET /agenda?day=today` (diário do dia feito/não + capturas
  a revisar), agregado no Fastify.
- **Label**: criar, listar em árvore, arquivar — **bloqueando arquivar label em uso** (com
  vínculo a itens OU com sub-labels ativos), com erro explicativo.
- **GuideQuestion**: perguntas-guia por label + `suggestedQuestionsForNote` (agrupadas por
  label, só ativas, omite labels sem pergunta). **Sem herança pela árvore** no MVP (decidido).
- **Attachment**: `attachFile` a uma Note (guarda URL + metadados; OCR fica para MVP 5,
  campos nascem null). **Upload/storage real ainda não definido** (ver decisões em aberto).
- **Frontend (mobile, Vite+PWA+Tailwind+i18n)**: design system com **tema claro/escuro**
  (acento roxo #6D5DFC, warm white / deep charcoal, Inter + serifa itálica nos subtítulos
  contemplativos, tab bar com botão de captura central elevado); telas de editor, captura+
  revisão, agenda de hoje, painel de perguntas + anexo.
- **Offline Nível 1**: captura/escrita funcionam sem rede (fila em IndexedDB + sync ao
  reconectar, optimistic UI, reconciliação de id temporário→real). **Sem resolução de
  conflito** (Nível 2 adiado). App abre offline (shell em cache).

---

## 6. PRÓXIMOS PASSOS — Roteiro dos MVPs

> Regra: cada MVP já é útil sozinho. O banco nasce preparado, mas só se constrói o que cada
> fase precisa.

### MVP 2 — Biblioteca + Objetivos (o próximo)

Introduz as tabelas **`Resource`, `Goal`, `Event`**. Entregas:

- Promover captura para **resource** e **goal** (hoje só promove para note).
- **Goal com `type`** (HABIT | TARGET | PROJECT | UMBRELLA) para desambiguar cadência.
- **Check de objetivo = criar um `Event`** (`type: done`). Progresso é **calculado** dos
  eventos: HABIT conta eventos no período; TARGET/PROJECT somam `value`; UMBRELLA agrupa
  filhos (não recebe check direto).
- **"Fechar o dia"** (ritual, não cobrança): lista pendentes e cada um resolve como **fiz** /
  **não fiz porque…** (`Event skip` + motivo) / **deixa pra lá** (saída fácil). Tom de
  recapitulação, nunca auditoria.
- `skip` é informação (alimenta o agente no futuro), não fracasso. Só `done` conta aderência.
- Biblioteca: listar/gerenciar `Resource` (livros, cursos, vídeos) com labels e status.
- Painel "X objetivos ativos".
- **Decisões a fechar no MVP 2:** comportamento de **desfazer check** (apagar o Event — única
  exceção ao "nunca excluir"); o que "deixa pra lá" grava (skip especial ou nada);
  conclusão de Goal UMBRELLA (provavelmente fechar na mão).

### MVP 3 — Métricas & evolução

Streaks, aderência, progresso, comparação período-a-período; alimenta as recapitulações. Tudo
agregação derivada, sem IA. **Enquadramento dos números (conquista vs neutro) é decisão desta
fase**, guiado pelo princípio anti-culpa.

### MVP 4 — Busca semântica

Tabela **`Embedding`** + **pgvector**, com chunking. "Pesquisar no meu cérebro."

### MVP 5 — Agente "EU"

Cobrança via WhatsApp/Telegram, triagem assistida, perguntas no devocional/reflexão,
recapitulações auto-resumidas, **transcrição de manuscrito por visão da IA** (OCR), interligação
automática, revisão espaçada (SM-2/FSRS), a "voz". **Limites do agente** já registrados (plano
seção 9): é espelho ativo, não piloto automático; pode sugerir/resumir/cobrar-em-convite, não
pode alterar dados sem confirmação, concluir objetivo sozinho, arquivar automaticamente, nem
tomar decisões espirituais pelo dono.

---

## 7. Decisões em aberto (a revisitar quando a fase chegar)

- **Auth real** (login/PIN) — `User` já existe; tela entra quando a PWA precisar ser protegida.
- **Onde guardar anexos** (disco vs S3/compatível) — `Attachment` guarda só a URL; o upload
  em si ainda não foi implementado. **Vai precisar ser decidido para a foto de manuscrito
  funcionar de ponta a ponta.**
- **Estratégia de OCR** — visão da IA via SDK; correções do dono afinam o prompt (MVP 5).
- **Recorrência avançada** de objetivos — se vier, um campo `recurrence Json?` **substitui**
  os campos simples de cadência.
- **Migrar `Event.type`/`Goal.type` para enum** quando estabilizarem.
- **Offline Nível 2** (app inteiro offline + resolução de conflito) — o ponto mais caro;
  só se houver uso multi-dispositivo intenso.
- **Rollup de subárvore de labels** ("todos os Livros" incluir sub-labels) — CTE recursiva
  ou resolver no app.
- **Perguntas-guia herdadas pela árvore** — hoje **não herda** (label exato); revisitar se
  incomodar.
- **Streak do diário** — calcular direto das Notes (recomendado) ou via Goals.
- **Export `.md`**, **desarquivar**, **sync Google Calendar** — melhorias futuras opcionais.

---

## 8. Como retomar numa conversa nova

1. Anexe/cole este HANDOFF e diga em que MVP/tarefa quer trabalhar.
2. Para detalhe fino, aponte os documentos do repo: `CLAUDE.md`, `docs/plano-segundo-cerebro.md`,
   `docs/BACKLOG.md`, `docs/tasks/*`.
3. Mantenha o método: decidir trade-offs por perguntas → registrar no plano → fatiar em
   tarefas pequenas → cada tarefa ponta a ponta com testes → Claude Code executa uma por vez.
4. Para qualquer frontend novo, repita o padrão de correção visual (imagens de referência no
   repo + diagnóstico antes de corrigir + travar lógica/testes).
   > **Estado atual: MVP 1 completo. Próximo: MVP 2 (Resource, Goal, Event + check/fechar o dia).**
