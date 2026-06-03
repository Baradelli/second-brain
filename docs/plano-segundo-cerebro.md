# Segundo Cérebro — Plano Geral do Projeto

> Documento de alinhamento. Descreve o sistema que vamos construir, as decisões já
> tomadas, o modelo de dados, os módulos e o roteiro por MVPs. Serve de fonte da
> verdade antes de começarmos a codar passo a passo.

---

## 1. A dor, o objetivo e os princípios

Eu vejo, leio e penso coisas interessantes o tempo todo — vídeos, filmes, ideias,
livros, cursos — e **perco quase tudo** porque não tenho onde guardar nem um ritual
para revisar. O objetivo é um "segundo cérebro": um lugar único onde eu capturo
qualquer coisa sem atrito, reviso num dia fixo da semana, transformo o que vale em
compromisso ou conhecimento, e ao longo do tempo construo um mapa da minha vida (o que
faço, o que aprendo, o que abandono).

Além de capturar e revisar, o dia tem um ritmo fixo: **devocional pela manhã** e
**reflexão à noite** — práticas espirituais que também entram no mapa da minha vida, com
recapitulações no fim de cada semana, mês e ano.

No fim, isso deve ter um agente que pensa como eu — minha voz interna jogada pro mundo —
que me cobra, me questiona e me ajuda a achar conexões.

### Princípios

- **Visão: mapear a vida.** Capturar, registrar e refletir o máximo da minha vida é o
  norte que dá sentido ao sistema (ao log append-only, às métricas, ao agente).
- **Princípio anti-culpa (UX e tom do agente).** O sistema **não pune ausência de
  registro; valoriza qualquer registro útil**. As telas, as métricas e principalmente o
  agente nunca falam em tom de falha ("você não registrou 3 dias"), e sim de convite
  ("quer fazer uma recap rápida da semana?"). A visão dá ambição; este princípio garante
  que ela nunca vire peso. Aceitar lacunas faz parte do desenho.
- **Atrito mínimo.** Capturar e dizer "fiz" custam um toque ou uma frase. No segundo em
  que registrar vira trabalho, eu abandono.
- **Núcleo vivo cedo, não sistema completo no dia 1.** Implementar o menor circuito de
  valor (escrever, capturar, revisar, consultar) e crescer sobre uso real. O maior risco
  não é técnico — é o sistema ficar grande antes de virar hábito.

---

## 2. Princípio central: é UM sistema, não três

A ideia nasceu como três projetos (agenda, captura, base de conhecimento), mas eles são
**o mesmo sistema** com estados diferentes. Tudo entra como captura ou anotação; na
revisão, vira conhecimento, objetivo, recurso, evento ou arquivo:

```
        CAPTURA  ──►  REVISÃO  ──►  vira OBJETIVO (agenda)
       (inbox)       (triagem)  ──►  vira RECURSO / ANOTAÇÃO (conhecimento)
                                ──►  ARQUIVA (nunca exclui)
```

O **agente** é uma camada transversal por cima disso tudo: cobra os objetivos, ajuda na
triagem, gera perguntas de revisão, acha conexões e responde à busca.

Construir assim significa um núcleo só (dados + busca + agente) com vários fluxos/telas
em cima — em vez de três apps para integrar depois (que é onde projetos assim morrem).

---

## 3. Decisões de arquitetura já tomadas

- **Tudo mora no meu sistema — sem Obsidian.** A escrita e o conhecimento ficam todos no
  núcleo próprio. O Obsidian sai como dependência; no máximo vira um export `.md` opcional
  lá na frente. Não fico refém de ninguém e virar produto não muda nada.
- **Editor próprio com TipTap.** Headless, sobre o ProseMirror: a tela é nossa e os
  recursos (negrito, cor, títulos, listas, citação, links) vêm de extensões modulares.
  O **mesmo editor** serve devocional, reflexão, fichamento e nota-livre.
- **Uma só tabela de anotação.** Tudo que escrevo no TipTap é `Note`; a diferença entre
  devocional, reflexão, fichamento e nota é só o `type`/`scope`, não a estrutura — então
  **não existe "modelo simples vs complexo"** (seria atrito sem ganho).
- **O conteúdo escrito é guardado como documento do editor (JSON do TipTap) — a fonte da
  verdade.** O texto puro (`plainText`) e os embeddings são _derivados_ disso, só para
  busca e métricas.
- **Captura ≠ escrita.** A captura é uma **textarea** simples (multilinha, texto puro, sem
  formatação) — rápida e sem cerimônia, dá pra anotar uma ideia inteira; o editor rico
  (TipTap) fica reservado para as anotações.
- **Multiusuário desde o início (no banco).** `User` e `userId` em todas as tabelas desde o
  MVP 1, mesmo sendo só eu — adicionar isso depois exigiria migrar tudo. Ainda **sem tela de
  login** no começo (um usuário fixo); a auth real entra quando fizer sentido.
- **Labels em árvore que eu cadastro.** Tabela `Label` própria e hierárquica (ex.: História
  sob Livro), com **vários labels por item** (many-to-many) em Capture, Resource, Note e
  Goal. Substitui o antigo `type` do recurso e resolve forma vs tema — os dois viram
  labels. Sempre opcional (não trava a captura).
  > _Nota de atenção (do review):_ a árvore na UI pode adicionar carga mental ("onde isso se
  > encaixa?"). Optei por já fazer a UI de árvore; vale vigiar para que não atrapalhe a
  > captura rápida.
- **Objetivo tem `type` explícito.** `HABIT | TARGET | PROJECT | UMBRELLA` diz como
  interpretar os campos de cadência (`periodo`, `quantidade`, `dias`, `total`), evitando a
  ambiguidade de campos soltos.
- **Evento é só ação.** `done | skip | progresso | conclusao | abandono` (e poderá crescer).
  **Nota nunca é evento** — nota é sempre `Note`. Uma anotação pode se ligar a um evento
  via `eventId` ("li 12 páginas" = Evento; "o que aprendi" = Anotacao).
- **Perguntas-guia por label (andaime, não estrutura).** Alguns labels carregam perguntas
  pré-configuradas. Ao escrever, um botão "perguntas sugeridas" abre um painel com elas
  **agrupadas por label**. São provocação para pensar — a anotação segue 100% livre.
- **Anexos numa tabela própria.** `Attachment` polimórfica (liga a Anotacao, Captura ou Recurso)
  suporta várias imagens, PDF, áudio etc. A foto de página manuscrita e a transcrição
  OCR/IA moram aqui — não em campos soltos da Note.
- **Embeddings em tabela própria (desenho da fase de busca).** `Embedding` separada, com
  chunks e modelo, para indexar anotação/captura/recurso do mesmo jeito, recalcular e
  trocar de modelo sem poluir as tabelas principais. Criada só no MVP 4.
- **Soft delete padronizado.** Tudo que aparece na UI usa `status` + `archivedAt`
  (Capture, Resource, Goal, Note, Label). Arquivar some da visão padrão mas continua
  no banco. **Event é log imutável** — não se arquiva.
- **Progresso nunca é guardado — é calculado.** "38% do livro", "2/3 esta semana" e streaks
  saem da soma dos eventos. Nada de campo desatualizando.
- **Tipos: enums onde é fechado, String onde evolui.** Enum em `status` e em
  `Note.type`/`Note.scope` (valores estáveis; o banco rejeita inválidos). `String`
  em `Event.type` e `Goal.type` enquanto ainda podem ganhar valores com o uso — viram
  enum depois, quando estabilizarem.
- **Datas em UTC, "o dia" no fuso do usuário.** O banco guarda timestamps em UTC, mas todo
  cálculo de "que dia é hoje" (agenda, escopo de data, streaks, recapitulação, unicidade do
  diário) usa o `timezone` da Config. Sem isso, um servidor em UTC jogaria a reflexão das
  22h para o dia seguinte e quebraria streaks e a agenda.
- **Validação de borda com Zod, schema único compartilhado.** Toda entrada da API é validada
  com Zod (datas, horários `HH:mm`, os `String` que fazem papel de enum como
  `Event.type`/`Goal.type` via `z.enum`, campos de cadência). Os schemas moram em
  `shared/` e são usados pelos **dois lados**: no backend via `fastify-type-provider-zod`
  (que valida, infere os tipos TS e **gera o Swagger/OpenAPI automaticamente** — doc que não
  envelhece) e no frontend via React Hook Form + `@hookform/resolvers/zod`. Um schema, três
  usos, zero divergência.
- **Offline-first Nível 1 (captura/escrita).** Capturar e escrever funcionam sem sinal: vão
  para uma fila local (Service Worker) e sincronizam quando a conexão volta. Cobre o caso
  crítico ("ideia no busão sem 4G"). O Nível 2 (app inteiro offline, com resolução de
  conflito) fica como decisão consciente para depois — é onde apps offline morrem, e como é
  single-user no começo, conflito real é raro.
- **Performance mobile como restrição de projeto.** O gargalo no celular é JS baixado/parseado,
  não a lógica. Regras desde já: **code-splitting** (o bundle do caminho crítico — abrir +
  capturar — fica leve e separado do TipTap); **virtualização/paginação** de toda lista longa
  (histórico de anotações pode ter milhares); **lazy-load** das telas pesadas; vigiar
  re-renders. Não exige trabalho extra agora, mas orienta as decisões de estrutura.
- **Escrita à mão é bem-vinda (foto + OCR).** Anexo a foto de uma página manuscrita a uma
  anotação. Guardar a imagem é simples e entra cedo; a **transcrição** usa a visão da IA e
  sempre passa pela minha revisão. "Treinar o agente" = acumular minhas correções para
  afinar prompt/contexto com o tempo.
- **Idioma: código em inglês, conteúdo em português.** Tabelas, colunas, entidades, enums,
  funções, variáveis e rotas em **inglês**. O **português** fica restrito ao conteúdo que o
  usuário vê. Essa fronteira clara é o que mantém o projeto são e torna a i18n possível.
- **Internacionalização desde o frontend (react-i18next).** Nenhum texto solto nas telas:
  tudo via `t('chave')`, com as strings em arquivos de tradução. `pt` é o idioma default;
  `en` é o segundo locale (pode começar incompleto). Chaves **semânticas em inglês**
  (`agenda.todayTitle`), não a frase como chave — o texto PT muda sem quebrar a chave.
- **Frontend em Vite (não Next), PWA.** O app é uma SPA offline-first; o Vite PWA plugin
  serve isso sem o peso e o atrito do Next (SSR/App Router ociosos para o nosso caso, e
  conflito Turbopack/Webpack para service worker). A arquitetura offline (service worker +
  IndexedDB) é independente de framework — Vite não tira nada.
- **Web e mobile com bases separadas, compartilhando o núcleo.** Pacotes `web/` e `mobile/`
  têm shells/layouts próprios (cada um com UX adequada à sua tela), mas **compartilham**
  schemas (`shared/`), componentes de UI (`ui/`), chamadas de API e lógica de cliente. Não
  são dois apps independentes (isso duplicaria manutenção), nem um app só espremido.
- **Sem BFF.** O Fastify já é o backend dedicado ao app; toda agregação que um BFF faria
  (ex.: montar a agenda do dia juntando notas/capturas) é um endpoint no próprio Fastify
  (`buildTodayAgenda`). Uma camada BFF separada seria um intermediário ocioso entre mim e
  mim mesmo.

---

## 4. Stack

| Camada             | Escolha                                                   | Por quê                                                                                                       |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Estrutura          | Monorepo: `shared/`, `backend/`, `web/`, `mobile/`, `ui/` | Schemas Zod e componentes UI reusados; web e mobile com bases próprias mas compartilhando o núcleo            |
| Backend            | Node.js + TypeScript + Fastify                            | Terreno que eu já domino; agrega para o front via endpoints (faz o papel de BFF, sem camada extra)            |
| Validação + Docs   | Zod + `fastify-type-provider-zod` + Swagger               | Um schema valida em runtime, infere os tipos TS e gera o OpenAPI — doc sempre atual                           |
| ORM / Banco        | Prisma + PostgreSQL                                       | pgvector no MVP 4; evita migrar depois                                                                        |
| Editor de escrita  | TipTap (headless, ProseMirror)                            | Tela própria; JSON estruturado; extensões de link/menção depois                                               |
| Frontend           | React + Vite (PWA)                                        | SPA offline-first; Vite PWA plugin sem brigar com build (Next traria SSR ocioso e conflito Turbopack/Webpack) |
| Formulários        | React Hook Form + `@hookform/resolvers/zod`               | Mesmo schema Zod do backend valida o form                                                                     |
| i18n               | react-i18next                                             | PT default + EN; chaves semânticas em inglês                                                                  |
| Offline            | Service Worker + fila local (Nível 1)                     | Capturar/escrever sem sinal; sincroniza ao voltar                                                             |
| Busca semântica    | pgvector (embeddings)                                     | "Pesquisar no meu cérebro"                                                                                    |
| Repetição espaçada | SM-2 / FSRS                                               | Algoritmo de agendamento de revisões                                                                          |
| Agente             | Anthropic SDK                                             | Cobrança, triagem, perguntas, a "voz"                                                                         |
| Cobrança (futuro)  | Bot WhatsApp/Telegram                                     | Push confiável e atrito quase zero                                                                            |

> Como o MVP 4 vai exigir pgvector, recomendo já subir Postgres em Docker desde o MVP 1 e
> evitar a migração.

---

## 5. Arquitetura e fluxo de desenvolvimento

### Camadas (DDD-lite)

Entidades simples, sem o arsenal tático completo de DDD (sem value objects/agregados/eventos
de domínio por ora). O que importa é a separação que torna o domínio testável sem
infraestrutura:

```
Rota/Controller (Fastify)  →  UseCase  →  Repository (interface)  →  Prisma
        ↑ valida com Zod       ↑ regra      ↑ contrato de            ↑ implementação real
        (borda)                de negócio   persistência       (+ fake em memória nos testes)
```

- **Rota/Controller** — recebe o request, valida com o schema Zod de `shared/`, chama o
  UseCase. Não tem regra de negócio.
- **UseCase** — a ação da aplicação ("criar anotação", "fechar o dia"). Orquestra a regra de
  negócio. Recebe dados já válidos e tipados; não conhece Fastify nem Prisma.
- **Repository** — interface que abstrai a persistência ("salvar anotação", "buscar
  pendentes de hoje"). Tem uma implementação Prisma (produção) e uma **fake em memória**
  (testes).
- **Domínio (entidades)** — Note, Goal etc. Não conhecem nem o framework nem o ORM.

Por que Repository: os testes de UseCase rodam **sem banco**, com o repositório fake — rápidos
e isolados. É isso que faz o TDD fluir; sem ele, testar caso de uso vira mock de Prisma frágil
ou dependência de Postgres no CI.

### Fluxo de trabalho (TDD + DDD, outside-in)

Para cada caso de uso, nesta ordem:

1. **Definir o domínio** — só da fatia atual (não modelar o sistema inteiro; evita paralisia).
2. **Criar o caso de uso** (assinatura/contrato).
3. **Escrever os testes** do caso de uso (usando o Repository fake).
4. **Implementar o mínimo** para passar.
5. **Rodar os testes** (red → green).
6. **Refatorar** (green mantém).
7. **Só então** criar controller/rota/tela por cima.

Ciclos curtos: o domínio cresce caso de uso a caso de uso, sempre coberto por testes antes
de tocar em infraestrutura ou UI.

### Política de testes (calibrada — TDD a serviço de entregar o app)

TDD vale **desde o primeiro caso de uso**, mas "testar tudo" não significa 100% de tudo
(inclusive UI), porque cobertura total num projeto em descoberta vira âncora: cada ajuste de
tela exige reescrever teste, e aí ou se evita mudar a tela ou se abandona os testes. A meta
real não é "tudo testado" — é **nunca ter medo de refatorar**, e isso vem de um domínio
blindado por baixo. Profundidade por camada:

- **UseCases / domínio** → TDD estrito, cobertura alta. Teste antes, sempre. É o coração do
  sistema (derivar `plainText`, não duplicar evento ao fechar o dia, contar/somar por tipo
  de objetivo, marcar destino na promoção). Testes rápidos, com Repository fake, sem banco.
- **Repository** → um **teste de contrato** contra a implementação Prisma real (garante que a
  query cumpre o que a interface promete). Poucos, mas existem.
- **Rotas** → **integração nos caminhos críticos** (criar anotação ponta a ponta; Zod
  rejeitando entrada inválida). Não em cada rota trivial.
- **UI/telas** → teste só nos fluxos que quebram em silêncio. O resto valido usando — é um app
  pessoal, eu sou o QA.

> Calibragem mudaria se o objetivo fosse _praticar TDD a fundo_ (aí testar as bordas
> agressivamente seria proposital). Aqui o objetivo é entregar o app; o TDD serve a isso.

---

## 6. Modelo de dados

> **Regra de idioma:** todo o código, schema e banco em **inglês** (tabelas, colunas,
> entidades, enums, funções, rotas). O **português** fica restrito ao conteúdo que o
> usuário vê (textos de UI, via i18n). As explicações abaixo seguem em português por serem
> documentação para o dono; os identificadores são os reais.

Cada tabela com um papel claro — de propósito **não** é uma tabela-Deus com dezenas de
campos nuláveis.

- **User** — eu (e, no futuro, outros). Dono de tudo; `userId` em todas as tabelas.
- **Settings** — preferências: dia da revisão, dia da recapitulação semanal, timezone,
  horários do devocional e da reflexão.
- **Capture** — o inbox. Texto livre que jogo pra revisar depois, com data de revisão.
- **Note** — **tudo que escrevo no TipTap**: devocional, reflexão, fichamento e nota-livre,
  diários ou nas recapitulações. A diferença é só `type`/`scope`. Pode apontar para Goal,
  Resource ou Event.
- **Resource** — a biblioteca (livros, cursos, vídeos…), com status e labels. Existe sozinho.
- **Goal** — o compromisso (a cadência), com `type` explícito. Pode apontar para Resource.
- **Event** — o log do "fiz" (ações). Aponta para Goal, Resource ou nada. Imutável.
- **Label** — rótulos hierárquicos que eu cadastro; vários por item, em Capture, Resource,
  Note e Goal. Alguns carregam guide questions.
- **GuideQuestion** — perguntas opcionais ligadas a um Label (andaime para pensar).
- **Attachment** — imagens/PDF/áudio ligados a Note, Capture ou Resource. Foto manuscrita +
  OCR moram aqui.
- **Embedding** _(MVP 4)_ — chunks vetoriais para busca semântica, desacoplados.

> **Capture, Resource, Goal e Event são dados estruturados.** Só **Note** tem corpo de
> editor — `doc` (JSON do TipTap) + `plainText` derivado.

Relação resumida:

```
                         User  (dono de tudo — userId em todas)
                           │
   Label (árvore) ─┬─< Capture       Note >──┬─ Goal ──< Event
   GuideQuestion >─┘   Resource  <───┘        └─ Resource
        (labels: Capture, Resource, Note, Goal)
   Attachment ──> Note | Capture | Resource
   Embedding (MVP 4) ──> indexa Note | Capture | Resource
```

### Esqueleto Prisma (referência)

```prisma
// ---- enums (valores fechados) ----
enum GeneralStatus  { ACTIVE  ARCHIVED }
enum CaptureStatus  { PENDING  PROCESSED  ARCHIVED }
enum ResourceStatus { QUEUE  ACTIVE  DONE  ABANDONED  ARCHIVED }
enum GoalStatus     { ACTIVE  DONE  PAUSED  ARCHIVED }
enum NoteType       { DEVOTIONAL  REFLECTION  STUDY_NOTE  NOTE }
enum NoteScope      { DAY  WEEK  MONTH  YEAR }
// Event.type e Goal.type ficam como String por enquanto (ainda evoluem; validados por z.enum).

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  // relações reversas omitidas por brevidade
}

model Settings {
  id              String @id @default(cuid())
  userId          String @unique
  user            User   @relation(fields: [userId], references: [id])
  reviewWeekday   Int    @default(0)   // 0=domingo ... 6=sábado
  recapWeekday    Int    @default(0)
  timezone        String @default("America/Sao_Paulo")  // "o dia" é calculado neste fuso
  devotionalTime  String @default("07:00")               // formato HH:mm (validado na API)
  reflectionTime  String @default("21:00")               // idem
}

model Label {
  id        String          @id @default(cuid())
  userId    String
  user      User            @relation(fields: [userId], references: [id])
  name      String
  parentId  String?                                  // a árvore: "History" sob "Book"
  parent    Label?          @relation("Tree", fields: [parentId], references: [id])
  children  Label[]         @relation("Tree")
  color     String?
  status    GeneralStatus   @default(ACTIVE)
  archivedAt DateTime?
  createdAt DateTime        @default(now())
  resources Resource[]      @relation("ResourceLabels")
  captures  Capture[]       @relation("CaptureLabels")
  notes     Note[]          @relation("NoteLabels")
  goals     Goal[]          @relation("GoalLabels")
  questions GuideQuestion[]
}

model GuideQuestion {
  id      String  @id @default(cuid())
  labelId String
  label   Label   @relation(fields: [labelId], references: [id])
  text    String                                     // "Was it an easy read?"
  order   Int     @default(0)
  active  Boolean @default(true)
}

model Capture {
  id            String        @id @default(cuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  text          String                               // textarea, texto puro
  url           String?
  status        CaptureStatus @default(PENDING)
  reviewAt      DateTime?                             // cai na agenda do dia da revisão
  processedAt   DateTime?                             // quando foi triada
  promotedToType String?                              // "resource" | "goal" | "note"
  promotedToId  String?                               // id do que ela virou
  archivedAt    DateTime?
  archiveReason String?
  labels        Label[]       @relation("CaptureLabels")
  attachments   Attachment[]
  createdAt     DateTime      @default(now())
}

model Resource {
  id        String         @id @default(cuid())
  userId    String
  user      User           @relation(fields: [userId], references: [id])
  title     String
  source    String?                                  // autor / canal / plataforma
  url       String?
  status    ResourceStatus @default(QUEUE)
  total     Int?                                     // 320 páginas, 40 aulas...
  unit      String?                                  // page | lesson | episode
  meta      Json?
  labels    Label[]        @relation("ResourceLabels")
  goals     Goal[]
  events    Event[]
  notes     Note[]
  attachments Attachment[]
  archivedAt DateTime?
  createdAt DateTime       @default(now())
}

model Goal {
  id         String       @id @default(cuid())
  userId     String
  user       User         @relation(fields: [userId], references: [id])
  title      String
  type       String                                  // HABIT | TARGET | PROJECT | UMBRELLA
  status     GoalStatus   @default(ACTIVE)
  parentId   String?                                 // "gym 3x" -> "get in shape"
  parent     Goal?        @relation("Sub", fields: [parentId], references: [id])
  children   Goal[]       @relation("Sub")
  resourceId String?
  resource   Resource?    @relation(fields: [resourceId], references: [id])

  // cadência simples (interpretada conforme `type`):
  period     String?                                 // day | week | month
  quantity   Int?                                    // 3 (vezes), 10 (páginas)
  unit       String?
  weekdays   Int[]                                   // [1,3,5] = seg/qua/sex
  total      Int?                                    // PROJECT/TARGET: conclui ao atingir
  // recorrência avançada (futuro): um campo `recurrence Json?` SUBSTITUI estes campos.

  labels     Label[]      @relation("GoalLabels")
  events     Event[]
  notes      Note[]
  archivedAt DateTime?
  createdAt  DateTime     @default(now())
}

model Event {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id])
  goalId     String?
  goal       Goal?     @relation(fields: [goalId], references: [id])
  resourceId String?
  resource   Resource? @relation(fields: [resourceId], references: [id])
  type       String                                  // done | skip | progress | completion | abandonment
  value      Float?                                  // 12 (páginas lidas hoje)
  reason     String?                                 // no skip: "sick" | "procrastinated"
  occurredAt DateTime  @default(now())               // log imutável — sem arquivamento
}

model Note {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  type        NoteType
  scope       NoteScope     @default(DAY)
  date        DateTime                               // início do período a que se refere
  title       String?
  doc         Json                                   // TipTap — fonte da verdade
  plainText   String        @default("")             // derivado, para busca/métricas
  goalId      String?
  goal        Goal?         @relation(fields: [goalId], references: [id])
  resourceId  String?
  resource    Resource?     @relation(fields: [resourceId], references: [id])
  eventId     String?                                // "o que aprendi" ligado a um Event
  event       Event?        @relation(fields: [eventId], references: [id])
  labels      Label[]       @relation("NoteLabels")
  attachments Attachment[]
  status      GeneralStatus @default(ACTIVE)
  archivedAt  DateTime?
  createdAt   DateTime      @default(now())

  // "um devocional por dia / uma super-reflexão por semana" é garantido na APLICAÇÃO,
  // não por constraint — senão eu não poderia ter dois fichamentos no mesmo dia.
}

model Attachment {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  url           String
  type          String                               // image | pdf | audio | video | other
  mimeType      String?
  name          String?
  size          Int?
  // OCR (só para imagem manuscrita):
  transcription String?                              // saída crua da IA, antes da revisão
  ocrStatus     String?                              // pending | transcribed | reviewed
  noteId        String?
  note          Note?    @relation(fields: [noteId], references: [id])
  captureId     String?
  capture       Capture? @relation(fields: [captureId], references: [id])
  resourceId    String?
  resource      Resource? @relation(fields: [resourceId], references: [id])
  createdAt     DateTime @default(now())
}

// ---- MVP 4 (busca): criado só na fase de busca ----
model Embedding {
  id         String   @id @default(cuid())
  userId     String
  entity     String                                  // note | capture | resource
  entityId   String
  chunkIndex Int      @default(0)
  text       String
  model      String
  // embedding  Unsupported("vector")?               // pgvector
  createdAt  DateTime @default(now())
}
```

### Como os casos reais caem nesse modelo

| Eu quero...                            | Como vira dado                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| Finalizar o livro X (10 págs/dia)      | Resource `{ unit: page, total: 320 }` + Goal `{ type: PROJECT, period: day, quantity: 10 }` |
| Finalizar o curso Y                    | Resource `{ unit: lesson }` + Goal `{ type: PROJECT, total: nº de aulas }`                  |
| Um livro de história                   | Resource com labels `{ Book, History }`                                                     |
| Ir à academia 3x/semana                | Goal `{ type: HABIT, period: week, quantity: 3 }` + labels `{ Health }`                     |
| Academia seg/qua/sex                   | Goal `{ type: HABIT, period: week, weekdays: [1,3,5] }`                                     |
| Entrar em forma (vago)                 | Goal `{ type: UMBRELLA }`; os hábitos acima entram como `children`                          |
| Li 12 páginas hoje                     | Event `{ type: progress, value: 12, resourceId }`                                           |
| O que aprendi nessa leitura            | Note `{ type: STUDY_NOTE, eventId, resourceId }`                                            |
| Fiz algo fora da agenda                | Event sem goal nem resource (log avulso)                                                    |
| Devocional da manhã                    | Note `{ type: DEVOTIONAL, scope: DAY }`                                                     |
| Super reflexão de domingo              | Note `{ type: REFLECTION, scope: WEEK }`                                                    |
| Foto da página manuscrita              | Attachment `{ type: image, noteId }` (+ transcription depois)                               |
| Perguntas ao anotar um livro religioso | painel junta `GuideQuestion` de `Book` ("foi fácil?") e `Religion` ("foi edificante?")      |

> Goals `UMBRELLA` **não se concluem sozinhos** — fecho na mão, ou servem só de
> guarda-chuva para os children mensuráveis. _(Decisão a confirmar.)_

## 7. Fluxos principais

- **Captura.** Uma **textarea** (texto puro): jogo "filme tal", "ideia X" ou um parágrafo
  inteiro. Já nasce com `reviewAt` e posso marcar **labels**, sempre opcional — nada trava
  a captura.
- **Escrita (editor TipTap).** Cria toda `Note` — devocional, reflexão, fichamento,
  nota. Salva `doc` + `plainText`. Pode estar ligada a objetivo, recurso ou evento.
- **Perguntas-guia.** Botão "perguntas sugeridas" → painel com as `GuideQuestion` dos labels
  da anotação, **agrupadas por label**. Só os labels que têm perguntas. Consulta, não
  preenchimento.
- **Escrita à mão (foto + OCR).** Anexo a foto de uma página manuscrita (vira `Attachment`).
  Quando quiser, peço a transcrição: a IA lê a imagem e preenche um rascunho que eu
  **reviso**. A foto original fica guardada de qualquer jeito.
- **Agenda do dia.** Objetivos/tarefas do dia + os momentos de diário (devocional, reflexão)
  - capturas com `reviewAt <= hoje`.
- **Revisão.** Em cada captura decido: **promover** (vira Resource/Goal/Note) ou
  **arquivar**. O destino fica registrado (`promovidaParaTipo`/`promovidaParaId`). Nunca
  exclui.
- **Check de objetivo = criar Evento.** O objetivo não tem campo "feito hoje"; dar check
  cria `Event { goalId, type: "done" }`. O "pendente de hoje" é **calculado**: o
  objetivo é esperado hoje (pela cadência) e ainda não tem evento (done nem skip) dentro do
  dia. Ao registrar qualquer evento, ele sai dos pendentes — sem flag "resolvido".
  Como ler o progresso depende do `type`: **HABITO** conta eventos no período; **META**
  soma `valor` no período; **PROJETO** soma `valor` até `total`; **GUARDA_CHUVA** não recebe
  check (só agrupa filhos).
- **Fechar o dia (ritual, não cobrança).** À noite, uma ação lista os pendentes e pede uma
  resolução para cada um, com três saídas: **fiz** (`done`), **não fiz, porque…**
  (`skip` + `motivo`) ou **deixa pra lá / não se aplica** (saída fácil — sem motivo). O tom
  é de recapitulação ("como foi o dia?"), nunca de auditoria. Resolver é olhar cada item e
  dar uma resposta, **não** inventar justificativa para toda falha. Coerente com o princípio
  anti-culpa.
- **Skip é informação, não fracasso.** Só `done` conta como aderência; o `skip` com motivo
  alimenta o agente depois ("faltou 3x, todas por viagem") em vez de cobrar no escuro.
- **Desfazer check.** Como Evento é log imutável, desfazer um check marcado por engano é a
  única exceção ao "nunca excluir" — apagar aquele evento específico (erro de digitação, não
  memória). Confirmar o comportamento no MVP 2.
- **Biblioteca.** `Resource` agrupado por status/label → painel "X ativos".
- **Diário (devocional & reflexão).** Dois momentos fixos por dia, escritos no editor.
  "Já fiz hoje?" por consulta; unicidade garantida na aplicação.
- **Recapitulação.** Domingo (configurável) abre "super devocional" e "super reflexão"
  (escopo semanal); mês e ano idem. As métricas do período entram aqui.
- **Arquivo.** Arquivado some da visão padrão (`status` por baixo dos panos) mas continua
  acessível por um filtro "mostrar arquivados". Desarquivar fica para depois.

---

## 8. Roteiro por MVPs

A regra: **cada MVP já é útil sozinho**, e o primeiro corte é o menor circuito de valor
possível. O banco já nasce preparado para o futuro (User, labels, Attachment), mas só
construímos o que cada MVP precisa.

- **MVP 1 — Ritual diário + captura (o núcleo vivo).**
  Tabelas: `User`, `Settings`, `Capture`, `Note` (+ `Label` simples e `Attachment` conforme a
  escrita precisar). Editor TipTap; criar devocional e reflexão; captura rápida (textarea);
  lista de capturas pendentes; revisão manual (promover para anotação ou arquivar);
  consultar histórico/arquivo. PWA, sem IA. _Se eu abrir isso todo dia, o sistema nasce vivo._
- **MVP 2 — Biblioteca + objetivos.**
  `Resource`, `Goal` (com `type` e labels), `Event`. Promover captura para resource/goal,
  **check de objetivo** (cria Evento `done`), **fechar o dia** (resolve pendentes: fiz /
  não fiz porque / deixa pra lá), log, painel "X ativos", perguntas-guia por label.
  Decidir aqui o comportamento de **desfazer check**.
- **MVP 3 — Métricas & evolução.**
  Streaks, aderência, progresso, comparação período-a-período; alimenta as recapitulações.
  Tudo agregação derivada, sem IA. _(O enquadramento dos números — conquista vs neutro —
  é decisão desta fase, guiado pelo princípio anti-culpa.)_
- **MVP 4 — Busca semântica.**
  `Embedding` + pgvector, com chunking ("pesquisar no meu cérebro").
- **MVP 5 — Agente "EU".**
  Cobrança (WhatsApp/Telegram), triagem assistida, perguntas no devocional/reflexão,
  recapitulações auto-resumidas, transcrição de manuscrito por visão da IA, interligação
  automática, revisão espaçada, a voz. (Ver limites na seção 9.)

---

## 9. Limites do agente (a definir no MVP 5, registrado agora)

O agente é um **espelho ativo, não um piloto automático**: ele me devolve meus próprios
padrões a partir do que registrei. Não é fonte de verdade sobre quem eu sou, nem substitui
meu discernimento — especialmente nas áreas sensíveis (rotina espiritual, propósito,
identidade).

**Pode:** sugerir perguntas; resumir a semana/mês; encontrar conexões; apontar contradições;
cobrar objetivos (em tom de convite, não de falha); sugerir revisão de capturas; transformar
uma captura em rascunho de anotação.

**Não pode:** alterar dados sem confirmação; concluir objetivo sozinho; arquivar coisas
automaticamente; tomar decisões espirituais/devocionais no meu lugar; fingir certeza sobre
o meu estado emocional.

---

## 10. Por onde começamos (dentro do MVP 1)

O combinado é começar pela **tela de escrita** — a peça que eu quero primeiro e que todos
os rituais usam. O design fino fica para essa etapa; o protótipo de tela já feito serve de
referência.

### Passo 1 — A tela de escrita (editor)

1. Editor compartilhado com **TipTap** (negrito, itálico, títulos, listas, citação, link,
   cor) sobre o layout do protótipo.
2. Cria toda `Note` — devocional, reflexão, fichamento, nota — mudando só o
   cabeçalho/contexto.
3. Salva `doc` (JSON) + `plainText` derivado.
4. Botão "perguntas sugeridas": painel com as `GuideQuestion` dos labels, agrupadas.
5. Persistência mínima: `POST /anotacoes` e `GET /anotacoes?tipo=&escopo=&data=`.

### Passo 2 — Captura + revisão + agenda simples

1. Tabelas `User`, `Settings`, `Capture` (+ `Label`, `Attachment`), com os soft deletes.
2. Captura (textarea) + fila de revisão (`GET /capturas?status=PENDENTE`;
   `?status=ARQUIVADA` para o arquivo).
3. `GET /agenda?dia=hoje` — momentos de diário + capturas a revisar.
4. Revisão: `POST /capturas/:id/promover` (para anotação, no MVP 1) e
   `POST /capturas/:id/arquivar` (registra destino).
5. Tela PWA: agenda de hoje, capturas a revisar, captura sempre à mão.

> Sem Resource/Goal/Event/biblioteca/IA aqui — isso é MVP 2 em diante.

---

## 11. Decisões em aberto / a revisitar no futuro

- **Auth real** (login/PIN) — o `User` já existe no banco; a tela de login entra quando a
  PWA precisar ficar protegida na web.
- **Enquadramento das métricas** (conquista vs neutro) — decidir no MVP 3, guiado pelo
  princípio anti-culpa.
- **Recorrência avançada** (a cada 2 dias, último domingo do mês, dias úteis…) — se vier, um
  campo `recurrence Json?` **substitui** os campos simples de cadência (não convive com eles).
- **Conclusão de objetivos GUARDA_CHUVA** — fechar na mão (a confirmar).
- **Streak do diário** — calculado direto das Anotações (recomendado) ou via Objetivos.
- **Normalização da data por escopo** — Anotações de semana/mês/ano guardam `data` no início
  do período (domingo da semana, dia 1 do mês) para a checagem de unicidade na aplicação.
- **Migrar `Event.type` e `Goal.type` para enum** quando os valores estabilizarem.
- **Onde guardar anexos** — disco do servidor, S3/compatível; o `Attachment` guarda só a URL.
- **Estratégia de OCR** — começa com visão da IA via SDK; minhas correções afinam o prompt.
- **Offline Nível 2** (app inteiro offline, leitura/edição de tudo com resolução de
  conflito) — o Nível 1 (captura/escrita) já está decidido; o Nível 2 fica para quando/se
  houver uso multi-dispositivo intenso. É o ponto mais caro de toda a arquitetura.
- **Sync com Google Calendar** — opcional e posterior (caso de uso é tarefa, não evento).
- **Export `.md`** — portabilidade futura (e abrir no Obsidian, se eu quiser).
- **Desarquivar** — barato, fecha a metáfora "memória que ressurge".
- **Rollup de subárvore de labels** — "todos os Livros" deve incluir sub-labels (CTE
  recursiva no Postgres ou resolver no app).
- **Perguntas-guia herdadas pela árvore** — uma pergunta em "Livro" valer para tudo abaixo;
  decidir se herda ou fica no label exato.
- **Desfazer check** — apagar o Evento marcado por engano (única exceção ao "nunca
  excluir"); confirmar a UX no MVP 2.
- **"Deixa pra lá" no fechar o dia** — decidir se vira um `skip` com motivo especial (ex.:
  "n/a") ou simplesmente não cria evento. Detalhe de UI do MVP 2.
- **Interligação automática e perguntas geradas por IA** — desenho detalhado no MVP 5.

---

\*Próximo passo: construir o Passo 1 — a tela de escrita com TipTap, salvando `doc` (JSON)

- `plainText`, sobre o layout do protótipo.\*
