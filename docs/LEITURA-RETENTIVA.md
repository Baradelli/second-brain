# LEITURA-RETENTIVA.md — Estudo que gruda + Ensinar para reter + Agente IA

> Documento **vivo e de design**. Nasce de `docs/10-Praticas-de-Leitura-Retentiva.pdf` (síntese do
> _Oxford Handbook of Human Memory_, Kahana & Wagner eds.) e do pedido do dono: o app tem que
> **incentivar/facilitar estudar do jeito que o PDF prega**, transformar o que estudo em
> **publicação** (LinkedIn/Substack/blog/aula/vídeo) e começar a desenhar um **agente de IA**.
>
> Mesmo ritual dos outros docs: aqui é **design e discussão**; as specs por fatia vivem em
> `docs/tasks/` e a sequência em `docs/BACKLOG.md` (Blocos **N**, **O**, **P**). Detalhar **uma
> spec por vez**, conforme a tarefa se aproxima.

## Legenda

`[ ]` a discutir · `[~]` em discussão · `[x]` fechado (specs geradas).

---

## 1. O que o PDF prega (síntese)

Uma fórmula curta: **ler menos fluentemente, recuperar mais, espaçar melhor, comparar mais,
dormir melhor.** As 10 práticas, agrupadas:

| Cluster                                       | Práticas | Ideia central                                                                                                                                                                                                                      |
| --------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recuperação ativa / fichamento de memória** | 1, 6     | Fechar o livro e reconstruir de memória **antes** de olhar marcações/fichar. O ganho está no **choque** entre o que você achou que lembrava e o que o texto dizia. Fichar com o livro aberto é _ilusão de fluência_, não retenção. |
| **Perguntas + contexto episódico**            | 2, 8     | Formular 3–5 perguntas **antes/durante/depois**; ao revisar, **reinstalar o contexto** ("onde no argumento apareceu? contra quem? qual era a transição?").                                                                         |
| **Revisões espaçadas**                        | 3        | Distribuir revisões no tempo (mesmo dia → 2 dias → 1 semana → 1 mês), **sempre começando por tentar lembrar antes de reler**.                                                                                                      |
| **Metacognição**                              | 7        | Classificar cada tópico em **A** (sei explicar) / **B** (reconheço) / **C** (não sei) e **priorizar B e C** — não o que já parece fácil.                                                                                           |
| **Comparação**                                | 4, 5, 9  | **Intercalar** autores/temas; mapear onde **divergem de verdade**; **reduzir interferência** entre conteúdos parecidos (tese distintiva, texto-chave, ponto fraco, diferença).                                                     |
| **Sono**                                      | 10       | Ler o material decisivo num bloco que permita **dormir bem depois** — sono é parte do estudo, não prêmio.                                                                                                                          |

**Conceito-guarda-chuva (Bjork): "dificuldades desejáveis".** Espaçar, intercalar e recuperar
**pioram a fluência imediata mas melhoram retenção e transferência**. O app deve, então, _resistir_
à tentação de otimizar para a sensação de facilidade — e empurrar de leve para o esforço que retém.

### Extensão pedida pelo dono — **Ensinar para Reter**

Transformar o que se estuda em **post (LinkedIn), artigo (Substack/blog) ou roteiro (aula/vídeo)** é
a forma mais exigente de "produzir de memória": leva as Práticas 1 e 6 ao limite (efeito
protégé/Feynman — ensinar força reconstrução e expõe lacunas) e ainda alimenta a presença pública.
Cada artefato de estudo deve poder virar **rascunho de publicação** com baixo atrito.

---

## 2. Estado atual do app (o que já existe)

A fundação está quase toda lá:

- **`Resource`** — biblioteca (livro/curso/vídeo/artigo/podcast), com `stage` e `labels`.
- **`Note`** — conteúdo rico (TipTap); tipo `STUDY_NOTE` e FK `resourceId`/`eventId`/`goalId`.
- **`GuideQuestion`** — perguntas por `Label`.
- **`Goal` + `Event`** — objetivo durável + **log imutável**; progresso **calculado**.
- **`buildTodayAgenda`** — agrega o dia (diário + capturas + objetivos).
- **Calendário, Recaps, Settings (timezone), Labels, Busca.**

### A lacuna

Não existe **o motor que transforma "li isso" em "preciso recuperar/revisar isso"** e devolve
isso na agenda. Ou seja: nenhuma **recuperação ativa estruturada**, nenhum **espaçamento**, nenhuma
**metacognição A/B/C**, nenhuma **comparação entre autores**. Também não há **saída para publicação**
nem **camada de IA**. O PDF é exatamente sobre o que falta.

> No roadmap original, "spaced repetition" e o agente moravam no **MVP 5 (IA)**. A boa notícia: o
> coração do PDF (revisão espaçada + recuperação ativa) **não precisa de IA** — nasce manual,
> 100% coerente com os princípios do projeto (eventos imutáveis, progresso calculado, ritual
> anti-culpa). A IA entra **depois**, como assistente opcional.

---

## 3. Decisões fechadas (do dono, neste round)

- **Espaçamento por intervalos fixos:** revisou → **2 dias → 1 semana → 1 mês**. Igual para todos
  os tópicos (sem adaptação automática por dificuldade).
- **A/B/C é registro metacognitivo, não dirige o intervalo.** Você marca como se saiu (A/B/C) para
  **priorizar/destacar** o que sabe menos; a próxima revisão segue a escada fixa.
- **1ª leva cobre as Práticas 1, 2, 3, 6, 7, 8** (Bloco N) + **Publicação** (Bloco O) + **design do
  agente** (Bloco P). Comparação (4, 5, 9) e Sono (10) ficam para blocos futuros (§7).
- **IA neste round = só design.** Arquitetura prompt-first, **modo "cheap" (copiar prompt) primeiro**,
  API conectada depois. Nenhum código de IA agora.

---

## 4. Bloco N — Motor de Leitura Retentiva (revisão espaçada + recuperação ativa)

> `[x]` fechado — specs de fundação geradas (`tasks/58/59/60`).

Mesmo padrão de `Goal`/`Event`, já validado no MVP 2: **entidade durável + log imutável +
agendamento calculado**. Não dá para reusar `Event` porque `Event.goalId` é **obrigatório** (o log
atual é acoplado a `Goal`); então o log de revisão é entidade própria.

### Naming (decisão a revisar)

"Review/revisão" **já está em uso** no app (ritual de revisão de capturas, `Settings.reviewWeekday`,
`ReviewPage`). Para **não colidir no código** (regra do projeto: identificadores em inglês):

- **`StudyItem`** — a unidade de estudo a reter (durável), ligada a um `Resource`.
- **`Recall`** — o log imutável de cada tentativa de recuperação (mirror de `Event`).
- No **conteúdo/UI (português)** seguimos dizendo "revisão"/"revisar" normalmente.

> Se o dono preferir outro termo de domínio (`Retention`, `RecallItem`…), troca-se aqui. Anotado
> como decisão aberta.

### `StudyItem` (durável)

```
id, userId
resourceId            // de qual Resource veio (livro/curso); nullable p/ estudo avulso
title                 // ex.: "Cap. 3 — A ressurreição em Paulo"
reference             // ex.: "pp. 40–60" (texto livre, opcional)
questions  Json?      // { before: string[]; during: string[]; after: string[] }  (Prática 2)
fichamentoNoteId      // FK opcional → Note STUDY_NOTE escrita de memória  (Práticas 1/6)
status                // ACTIVE | ARCHIVED | CONSOLIDATED
archivedAt, createdAt // createdAt = dia do fichamento ("mesmo dia" da escada)
labelIds              // many-to-many com Label (padrão existente)
```

### `Recall` (log imutável — mirror de `Event`)

```
id, userId, studyItemId
confidence            // 'A' | 'B' | 'C'   (Prática 7)
note      String?     // observação curta opcional da revisão
occurredAt            // instante UTC; "o dia" calculado no timezone do Settings
createdAt             // sem status/archivedAt: log imutável; desfazer = hard delete (exceção doc.)
```

### Agendamento **calculado** (nunca guardado — princípio do projeto)

Helper puro no `domain/`, com Luxon (mirror de `compute-goal-progress` + `day-range`):

```
LADDER_DAYS = [2, 7, 30]                          // 2 dias → 1 semana → 1 mês
base   = última Recall.occurredAt ?? StudyItem.createdAt   // o fichamento é o "mesmo dia"
index  = nº de recalls já feitas (0, 1, 2)
nextRecallAt = index < LADDER_DAYS.length ? base.plus({days: LADDER_DAYS[index]}) : null
dueToday(tz) = nextRecallAt != null && localDay(nextRecallAt, tz) <= localDay(hoje, tz)  // atrasadas contam
```

Após 3 recalls (`nextRecallAt == null`) o item vira **CONSOLIDATED** e sai da agenda (não some —
só não cobra mais). O **A/B/C não muda o intervalo**: fica como flag/ordenação (ex.: destacar o que
você ainda marca "C"). _Decisão revisável: opcionalmente um "C" poderia repetir o passo atual em
vez de avançar — fica registrado como evolução._

### Como as práticas viram feature (Bloco N)

- **Recuperação ativa + fichamento de memória (1, 6):** tela em **duas fases** ligada a um
  `Resource` — (a) escrever de memória uma `Note STUDY_NOTE` com o livro fechado → (b) revelar e
  comparar. Cria o `StudyItem` + `fichamentoNoteId`. O app nomeia o passo (a) explicitamente como
  "sem olhar" para preservar o choque.
- **Perguntas antes/durante/depois (2):** campo `questions` no `StudyItem`, preenchido na criação
  e revisitado na revisão.
- **Revisões espaçadas (3):** motor `StudyItem`/`Recall` + escada fixa; **revisões devidas hoje
  aparecem na Agenda** ("Revisões de hoje"), cada uma começando por "tente lembrar antes de reler".
- **Metacognição A/B/C (7):** cada `Recall` grava `confidence`; a UI destaca o que você sabe menos.
- **Contexto episódico (8):** prompts **fixos** na tela de revisão — _"Onde no argumento apareceu?
  Contra quem argumentava? Qual era a transição?"_ (copy i18n, **sem** modelo de dados).

---

## 5. Bloco O — Ensinar para Reter (publicação)

> `[~]` em discussão — design fechado; specs a detalhar quando chegar.

Pilar próprio. **Funciona sem IA** (você escreve o rascunho); a IA do Bloco P só assiste.

```
Publication
  id, userId
  sourceType   // 'study_item' | 'note' | 'resource' | 'recap'
  sourceId
  format       // 'linkedin' | 'substack' | 'blog' | 'lesson' | 'video'
  status       // 'idea' | 'draft' | 'published'
  title
  noteId?      // FK → Note com o rascunho (reuso do editor TipTap)
  publishedAt?, createdAt, labelIds
```

**Fluxo:** de qualquer artefato de estudo (fichamento, nota, recap) → **"gerar ideia de
publicação"** → `Publication` em `idea` → rascunho (editor, ou assistido por IA) → `published`.

**Gatilho ambiente (o pulo do gato):** ao concluir um fichamento ou um recap, o app **convida** —
_"virar isso num post / numa aula?"_ — em tom de convite (princípio anti-culpa do §1 do plano),
nunca cobrança. Uma tela de **pipeline** mostra as publicações por status (idea → draft → published).

> _Decisão revisável:_ entidade dedicada **vs.** um novo `NoteType`. Recomendo a entidade pelo
> **pipeline de status + formato + fonte** (uma `Note` não carrega bem "de onde veio" e "em que
> estágio de publicação está").

---

## 6. Bloco P — Agente IA (prompt-first, modo _cheap_)

> `[ ]` a discutir — **só design neste round.** Nenhum código de IA agora.

### Fronteiras (do plano, **§9 — verbatim**, inegociável)

> O agente é um **espelho ativo, não um piloto automático**.
>
> **Pode:** sugerir perguntas; resumir a semana/mês; encontrar conexões; apontar contradições;
> cobrar objetivos (em tom de convite, não de falha); sugerir revisão de capturas; transformar uma
> captura em rascunho de anotação.
>
> **Não pode:** alterar dados sem confirmação; concluir objetivo sozinho; arquivar coisas
> automaticamente; tomar decisões espirituais/devocionais no meu lugar; fingir certeza sobre o meu
> estado emocional.

### Arquitetura prompt-first

A IA é, no fundo, **prompt**. Então o **produto real são os templates de prompt** — puros,
versionados, testáveis — e o backend de execução é trocável atrás de uma porta.

- **`PromptBuilder`** (em `shared/`, puro/determinístico → **testável por TDD**):
  `buildPrompt(skillKey, context)` monta o prompt com o conteúdo do usuário já interpolado.
  Templates i18n (pt default, en).
- **Porta `AiRunner`** (`usecases/ports/`), duas implementações:
  - **`CopyPasteRunner` — modo _cheap_, primeiro:** **não executa nada** — devolve o prompt montado
    para o usuário **copiar e colar** no seu próprio ChatGPT/Claude. **Custo zero, sem chave, e a
    IA não toca em dado nenhum** (aderência máxima ao §9).
  - **`AnthropicRunner` — modo conectado, depois:** roda o prompt via Anthropic SDK e devolve o
    texto. **Mesmos templates.**
- **Resultado** (colado de volta no modo cheap, ou retornado no conectado) vira **candidato** a
  `Note`/`Publication` — **sempre com confirmação do usuário** (§9: nunca altera dado sem confirmar).
- **Settings:** escolha de modo (cheap/conectado) + chave de API (só no conectado). Log
  `AiInteraction` opcional (qual skill, qual fonte, quando).

### Habilidades iniciais (templates) — ordem de implementação

Todas as quatro são alvo (escolha do dono); ordem do mais simples ao mais rico:

1. **`study.questions`** — gerar perguntas-guia **antes/durante/depois** de uma leitura (Prática 2).
   _1º template, simples e imediatamente útil._
2. **`study.fichamento_feedback`** — comparar o **fichamento de memória** × material e **apontar
   lacunas** (o "choque" das Práticas 1/6).
3. **`study.quiz`** — gerar **quiz de recuperação ativa** para a revisão espaçada (Práticas 3/7).
4. **`publish.draft`** — transformar um artefato em **post/artigo/roteiro** por formato (Bloco O).

_Futuras:_ `study.difference_map` (mapas de diferença, Práticas 4/5/9) · `recap.auto` (auto-recap).

---

## 7. Blocos futuros (registrados, sem spec)

- **Comparação / Mapas de Diferença (Práticas 4, 5, 9).** Nota estruturada ligada a **vários**
  `Resource`/autores sobre um tema: _onde concordam? só vocabulário? divergência real? qual problema
  cada um enxerga melhor?_ + por autor: _tese distintiva, texto-chave, ponto fraco, diferença_.
  **Intercalação** vira uma dica na agenda (sugerir alternar autores de um mesmo tema/label em vez
  de "zerar" um antes de tocar nos outros). Forte candidato a um **Bloco Q**.
- **Sono (Prática 10).** _Nudge_ leve: marcar um `StudyItem`/leitura como "material importante" e o
  app sugerir lê-lo num bloco com sono decente depois (usando `Settings`); evitar empurrar leitura
  decisiva para a madrugada. Baixo esforço, alto valor simbólico. Pode entrar como ajuste no Bloco N
  ou um mini-bloco próprio.
- **`study.difference_map` / `recap.auto`** — habilidades de IA que acompanham os blocos acima.

---

## 8. Princípios que este conjunto respeita

- **Anti-culpa (plano §1):** revisões e convites de publicação são **convite**, nunca auditoria.
  Item atrasado não "acusa" — só aparece como devido.
- **Progresso calculado, nunca guardado (§3):** `nextRecallAt` e "consolidado" derivam dos `Recall`.
- **Log imutável (§3):** `Recall` não arquiva; desfazer = hard delete (a mesma exceção do `Event`).
- **Datas em Luxon, "o dia" no timezone do Settings (CLAUDE.md):** o agendamento passa pelos helpers
  de data do `domain/`, nunca espalhado.
- **DDD-lite + portas:** UseCases dependem de interfaces; IA atrás de `AiRunner`; tudo testável com
  fakes. **Código em inglês, conteúdo em português.**

---

## 9. Sequência (resumo — ver `docs/BACKLOG.md`)

- **Bloco N (58–65):** migração → `createStudyItem` → escada+`logRecall` → repo/rota → agenda → telas.
- **Bloco O (66–69):** `Publication` (migração/domínio) → UseCases/repo/rota → gatilho → pipeline.
- **Bloco P (70–73):** `PromptBuilder` → `AiRunner`+`CopyPasteRunner` (cheap) → persistir resultado →
  _(futuro)_ `AnthropicRunner` (conectado).
