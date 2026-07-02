# GUIA-DE-USO.md — Como usar o Ghost Brain 🧠

> Guia prático, orientado a **rituais** (não a telas). Descreve o app **como ele é hoje**.
> Regra da casa que atravessa tudo: **anti-culpa** — o app é um espelho para pensar
> melhor, nunca um juiz. Lacuna faz parte do mapa.

---

## 0. Antes de tudo (setup mínimo)

O passo a passo completo está em [`docs/SETUP.md`](./SETUP.md) — em resumo:
`pnpm install` → `pnpm db:up` → `pnpm prisma:migrate` → `pnpm prisma:seed` →
`pnpm dev:backend` + `pnpm dev:mobile` (celular, `:5174`) e/ou `pnpm dev:web`
(desktop, `:5173`).

No primeiro acesso:

1. **Entre** com o usuário criado pelo seed — email do owner + senha padrão
   `cerebro123` (definida em `packages/backend/prisma/seed.ts`; exporte
   `SEED_OWNER_PASSWORD` antes de rodar o seed para trocar).
2. Abra **Configurações** e confira: **fuso horário** (tudo que é "hoje" depende dele),
   dia da **revisão semanal** e início da semana do **recap**. O tema claro/escuro
   fica em Configurações no web; no mobile é o botão no topo do app.
3. No web (desktop), um **tour guiado** abre sozinho na primeira visita — dá para
   reabrir no ícone `?` do topo.

---

## 1. O que é isso (e o que não é)

É **UM sistema só**, não três apps costurados. Tudo entra por um funil:

```
        CAPTURA  ──►  REVISÃO  ──►  vira OBJETIVO (agenda)
       (inbox)       (triagem)  ──►  vira RECURSO / ANOTAÇÃO (conhecimento)
                                ──►  ARQUIVA (nunca exclui)
```

Três princípios para não brigar com o app:

- **Captura sem atrito.** Capturar é uma caixa de texto e um toque. Não organize na
  hora de capturar — organizar é trabalho da revisão.
- **Anti-culpa.** Pular um dia, deixar revisão atrasar, responder "deixa pra lá" —
  tudo isso é informação, não fracasso. O app nunca cobra em tom de falha.
- **Nada se perde.** Não existe "excluir" no dia a dia — existe **arquivar**
  (reversível). Excluir de verdade só funciona em item já arquivado e sem vínculos.

---

## 2. O seu dia ideal

Nenhum passo é obrigatório. Este é o ritmo que o app foi desenhado para sustentar:

### ☀️ Manhã — Devocional

Abra o **Início/Agenda**: o dia mostra o devocional pendente. Escreva no editor
(negrito, listas, citações…). Digite `@` para ligar a nota a outra (uma passagem, um
estudo anterior) — isso vai construindo o seu grafo de conhecimento.

### 📥 Durante o dia — Capture tudo

Viu um vídeo, teve uma ideia, alguém citou um livro? Abra **Capturar** (botão central
no mobile; `Ctrl/Cmd+Shift+C` no web), escreva e solte. **No celular funciona sem
internet** — a captura entra numa fila local e sincroniza quando a conexão volta.
Não trie agora. Capture e volte para a vida.

### 📖 Bloco de estudo

O fluxo completo está no capítulo 4. Versão resumida: grifos enquanto lê → fechar o
livro → **fichamento de memória** → o app agenda as revisões sozinho.

### 🌙 Noite — Fechar o dia + Reflexão

**Fechar o dia** lista os objetivos pendentes de hoje e pede uma resposta para cada um:

| Botão | O que significa | O que grava |
| --- | --- | --- |
| **Fiz** | cumpri | evento `done` |
| **Não fiz, porque…** | não cumpri, e o motivo importa | evento `skip` + motivo |
| **Deixa pra lá** | hoje não se aplica — saída legítima, sem justificativa | nada |

O tom é de recapitulação ("como foi o dia?"), nunca de auditoria. Depois, escreva a
**Reflexão** — o segundo momento fixo do diário.

> Marcou "fiz" sem querer? Desfazer apaga aquele evento específico — a única exceção
> ao "nunca excluir" (erro de digitação não é memória).

---

## 3. A semana, o mês e o ano

- **Dia de revisão** (configurável): a agenda traz as **capturas pendentes**. Para
  cada uma, decida: **promover** (virar nota, recurso da biblioteca ou objetivo) ou
  **arquivar** (reversível — hoje com um toque; o campo de motivo existe na API, mas
  ainda não na tela). O destino da promoção fica registrado — o inbox zera sem nada
  se perder.
- **Recap semanal**: no dia configurado, escreva o "super devocional" / "super
  reflexão" da semana (tela **Recaps**). É o momento de olhar a semana como história,
  não como planilha.
- **Recap mensal e anual**: mesmo ritual, escopo maior. É aqui que o "mapa da vida"
  aparece — inclusive o que você abandonou (abandonar também é dado).

---

## 4. Como estudar um livro do início ao fim ⭐

O capítulo-estrela. Cada passo indica qual das **10 Práticas de Leitura Retentiva**
(`docs/10-Praticas-de-Leitura-Retentiva.pdf`) ele realiza.

**Exemplo-guia:** você vai estudar um livro de teologia sobre a ressurreição.

### P1. Cadastre o Resource na Biblioteca

**Biblioteca → novo recurso**: título, autor, total de páginas, labels (ex.: `Livro`,
`Teologia`). O recurso é o hub — grifos, fichamentos, objetivos e publicações penduram
nele.

### P2. Crie o objetivo de leitura

No detalhe do recurso (ou em **Objetivos**), crie um objetivo apontando para o livro
(ex.: projeto "terminar o livro", ou hábito "ler 10 páginas/dia"). Cada sessão de
leitura vira um check com valor ("li 12 páginas") — e o **progresso é calculado** dos
eventos, nunca digitado.

### P3. Antes de ler: perguntas 〔Prática 2〕

**Estudo → novo item de estudo**: escolha o recurso, dê um título ao trecho
(ex.: "Cap. 3 — A ressurreição em Paulo") e formule **3–5 perguntas "antes"**:
*que problema este capítulo resolve? o que espero encontrar?* Tentar responder antes
de estudar — mesmo errando — potencializa o aprendizado.

> 💡 IA aqui: o botão de assistente sugere perguntas-guia (skill de perguntas). Você
> revisa e confirma — nada entra sozinho.

### P4. Durante a leitura: grifos + checks

- **Grifos**: no detalhe do recurso, registre trechos com **cor com significado**
  (a paleta é sua, em Configurações — ex.: amarelo = ideia central, vermelho =
  discordo). Funciona para livro físico: digite o trecho e a página.
- Vá anotando as perguntas "durante": *isso responde minha pergunta? que dúvida nova
  surgiu?*
- Ao fim da sessão, **check no objetivo** com as páginas lidas.

### P5. Fechou a seção? Fichamento de memória em DUAS fases 〔Práticas 1 e 6〕

A cada 10–20 páginas (ou capítulo), no item de estudo:

1. **Fase 1 — escreva SEM olhar.** Livro fechado, grifos escondidos: *qual era a tese?
   quais argumentos? que exemplos?* A sensação de dificuldade é o ponto — fichar com o
   livro aberto é ilusão de fluência.
2. **Fase 2 — revele e compare.** O app mostra o material e você confronta. **O ganho
   está no choque** entre o que você achou que lembrava e o que o texto dizia.

> 💡 IA aqui: a skill de **feedback do fichamento** compara o que você escreveu de
> memória com o material e aponta lacunas — só DEPOIS que você escreveu.

### P6. Deixe o app cobrar as revisões 〔Práticas 3, 7 e 8〕

Criado o item de estudo, ele volta na **Agenda** em **2 dias → 1 semana → 1 mês**
("Revisões de hoje"). Em cada revisão:

1. A tela pede: **tente lembrar antes de reler** — e provoca com contexto episódico:
   *onde no argumento isso apareceu? contra quem o autor argumentava? qual era a
   transição?* 〔Prática 8〕
2. Marque a confiança: **A** (sei explicar) / **B** (reconheço) / **C** (não sei)
   〔Prática 7〕. O A/B/C **não muda** o intervalo — ele destaca o que você sabe menos,
   para priorizar B e C.
3. Após as 3 revisões, o item fica **consolidado** e sai da agenda (não some — só não
   cobra mais).

Revisão atrasada continua aparecendo como devida — sem acusação. Faça quando der.

> 💡 IA aqui: a skill de **quiz** gera perguntas de recuperação ativa para a revisão.

### P7. Ensine para reter: publique 〔leva as Práticas 1/6 ao limite〕

Ao concluir um fichamento ou recap, o app **convida**: *"virar isso num post / numa
aula?"* Aceite quando valer: nasce uma **Publicação** (ideia → rascunho → publicado)
nos formatos LinkedIn, Substack/blog, aula ou vídeo. Ensinar força a reconstrução
mais exigente que existe.

> 💡 IA aqui: a skill de **rascunho de publicação** transforma o artefato num primeiro
> rascunho no formato escolhido. O texto final é seu.

### O que o app ainda NÃO faz por você (faça manual, por ora)

- 〔**Prática 4** — intercalar autores〕 Mantenha 2–3 recursos ativos do mesmo tema e
  **alterne** entre eles, em vez de "zerar" um antes de tocar nos outros
  (ex.: Paulo → N. T. Wright → Pannenberg → capítulo bíblico).
- 〔**Práticas 5 e 9** — mapas de diferença / interferência〕 Crie uma **nota livre**
  por tema comparando os autores lidos: *onde concordam? é só vocabulário? onde a
  divergência é real?* E por autor: **tese distintiva, texto-chave, ponto fraco,
  diferença**. Ligue tudo com `@`. Após cada autor, recupere e registre antes de
  emendar o próximo.
- 〔**Prática 10** — sono〕 Leia o material decisivo num bloco que permita **dormir
  bem depois**. Sono é parte do estudo, não prêmio — não transforme leitura importante
  em madrugada.

*(As quatro estão no plano de melhoria — Bloco U do `docs/BACKLOG.md`.)*

### Resumo: passo → prática → onde

| Passo | Prática do PDF | Onde no app |
| --- | --- | --- |
| Cadastrar recurso + objetivo | — (infraestrutura) | Biblioteca, Objetivos |
| Perguntas antes/durante/depois | 2 | Item de estudo |
| Grifos com cor significativa | — (apoio) | Detalhe do recurso |
| Fichamento de memória 2 fases | 1, 6 | Item de estudo |
| Revisões 2d/7d/30d + "tente lembrar" | 3 | Agenda → Revisões de hoje |
| Contexto episódico na revisão | 8 | Tela de revisão |
| Confiança A/B/C | 7 | Tela de revisão |
| Publicar o que valeu | 1/6 no limite | Publicações |
| Intercalar / mapa de diferença / sono | 4, 5, 9, 10 | manual (por ora) |

---

## 5. Guia da IA (assistente, nunca piloto)

### A regra de ouro

A IA do app **nunca grava nada sem a sua confirmação**. Toda saída é um **candidato**:
você vê a prévia, edita se quiser, e só então confirma. E ela **nunca decide questões
espirituais ou devocionais por você** — isso é limite de projeto (plano §9), não
detalhe.

### As 4 skills e quando usar

| Skill | Quando | Onde aparece |
| --- | --- | --- |
| **Perguntas-guia** | antes de ler um material | ao criar item de estudo |
| **Feedback do fichamento** | DEPOIS do fichamento de memória | no item de estudo |
| **Quiz de revisão** | na revisão espaçada | no item de estudo / revisão |
| **Rascunho de publicação** | ao transformar estudo em post/aula | em Publicações |

No **mobile**, os botões de IA aparecem no contexto (nas telas de estudo e
publicações). No **web**, tudo mora na aba **Assistente** (escolha a skill, preencha
os campos). *(A paridade completa — hub no mobile e botões inline no web — está no
plano, Bloco S.)*

### Modo cheap (padrão) — grátis, sem chave

1. Na superfície de IA, toque em **Copiar**. O app monta um prompt completo,
   já recheado com o seu material, e o coloca na área de transferência.
2. Cole no **seu** ChatGPT/Claude/Gemini (o plano grátis deles serve).
3. Copie a resposta, volte ao app e use **"Colei o resultado"**.
4. Revise a **prévia editável** → **confirme** → vira perguntas do item, nota ou
   rascunho de publicação.

Custo zero, nenhuma chave, e a IA externa só vê o que você colou.

### Modo conectado — automático, com a sua chave

1. Crie uma chave de API no console da Anthropic
   (<https://platform.claude.com/> → API keys). É pré-pago: carregue um valor pequeno
   (ex.: US$5) para começar.
2. Coloque a chave **no servidor** — arquivo `packages/backend/.env`:

   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```

   Reinicie o backend. A chave **nunca** vai para o navegador; o app chama a API só
   pelo backend.
3. Em **Configurações → Modo do assistente**, escolha **conectado** — a opção ainda
   aparece rotulada "Conectado (em breve)", mas já funciona (a correção do rótulo
   está na task 81 do plano).
4. Agora as superfícies de IA mostram **"Gerar com IA"** — um toque, e a resposta
   volta como candidato (mesma prévia + confirmação de sempre).

**Custo aproximado:** o modo conectado usa o modelo Claude Opus (US$5 por milhão de
tokens de entrada, US$25 por milhão de saída). Uma geração típica — perguntas, quiz,
feedback de fichamento — fica na casa de **poucos centavos de dólar** (US$0,02–0,15;
rascunhos longos podem passar disso). Acompanhe o consumo no próprio console da
Anthropic. Se der erro 429 (limite de uso) ou 502 (conexão), espere um pouco e tente
de novo — ou volte para o modo cheap, que funciona sempre.

### Boas práticas (importam mais que os botões)

- **Você escreve primeiro, a IA questiona depois.** Nunca peça resumo de um material
  que você ainda não leu/fichou — resumo pronto "achata" a retenção e mata exatamente
  a dificuldade desejável que faz o estudo grudar.
- Use a IA para **perguntar, comparar e apontar lacunas** — não para produzir por você.
- No fichamento: só chame o feedback **depois** da fase "sem olhar".

---

## 6. Web ou mobile?

Tudo funciona nos dois — é recomendação, não regra:

| Tarefa | Melhor em |
| --- | --- |
| Capturar (inclusive offline), dar check, fechar o dia, revisões do dia, devocional rápido | 📱 **Mobile** (bolso) |
| Escrever longo (fichamento, publicação), triar capturas, organizar labels, navegar backlinks/grafo, muitas coisas abertas ao mesmo tempo | 🖥️ **Web** (mesa) |

O web é um shell estilo Obsidian: **abas**, explorador lateral, painel direito com
**backlinks/outline** da nota aberta, **grafo de notas** e paleta de comandos. O
mobile é o app do dia a dia: barra inferior (Início · **Capturar** · Calendário) +
menu lateral com o resto — e **fila offline** para captura/escrita.

---

## 7. Referência rápida

### Telas

| Tela | O que faz | Mobile | Web |
| --- | --- | --- | --- |
| Início / Agenda | o dia: diário, capturas a revisar, objetivos, revisões devidas | tab bar | aba Agenda |
| Capturar | inbox de texto puro (offline no mobile) | tab bar (botão central) | `Ctrl/Cmd+Shift+C` |
| Revisão de capturas | promover (nota/recurso/objetivo) ou arquivar | lista de capturas | aba Review |
| Notas | todas as anotações (devocional, reflexão, estudo, livre) | menu | explorador/abas |
| Biblioteca | recursos (livros, cursos…) + grifos | menu | aba Recurso |
| Objetivos | hábitos, metas, projetos, guarda-chuvas + progresso | menu | aba Objetivo |
| Estudo | itens de estudo, fichamento 2 fases, revisões | menu | aba StudyItem |
| Publicações | pipeline ideia → rascunho → publicado | menu | aba Publicação |
| Fechar o dia | fiz / não fiz porque… / deixa pra lá | via Agenda | painel no Calendário |
| Calendário | mês com previsto × cumprido + detalhe do dia | tab bar | aba Calendário |
| Recaps | semana / mês / ano | menu | aba Recaps |
| Busca | por título e texto | menu | aba Busca |
| Assistente (IA) | as 4 skills nos dois modos | inline nas telas | aba Assistente |
| Labels | árvore de rótulos + perguntas-guia | menu | aba Labels |
| Grafo | mapa visual das notas ligadas | — | aba Graph |
| Configurações | fuso, dias de ritual, modo de IA, paleta de grifos (tema: aqui no web; no header no mobile) | menu | aba Settings |

### Atalhos do web

- `Ctrl/Cmd+P` — paleta de comandos · `Ctrl/Cmd+O` — quick switcher (pular para
  qualquer coisa) · `Ctrl/Cmd+Shift+C` — captura rápida · ícone `?` — reabre o tour.
- No editor: `@` menciona/liga notas · `/` abre o menu de blocos (título, lista,
  tabela, callout, divisor…).

### Glossário de 1 linha (alinhado ao `CONTEXT.md`)

**Captura** ideia crua no inbox · **Nota** texto rico no editor (devocional, reflexão,
estudo ou livre) · **Recurso** item da biblioteca · **Grifo** trecho marcado com cor
significativa · **Objetivo** compromisso com cadência (hábito/meta/projeto/guarda-chuva)
· **Evento** registro imutável de "fiz/pulei" · **Item de estudo** unidade de leitura
retentiva · **Recall** uma tentativa de lembrar (A/B/C) · **Publicação** saída
"ensinar para reter" · **Recap** super-diário de semana/mês/ano · **Candidato** saída
de IA aguardando sua confirmação.

---

## 8. FAQ (anti-culpa incluída)

**Esqueci de fechar o dia ontem.** Nada acontece. Feche hoje, ou deixe a lacuna — ela
faz parte do mapa. O app não pune ausência de registro.

**Capturei sem internet. Perdeu?** Não (no mobile): ficou na fila offline e sincroniza
sozinha quando a conexão voltar.

**Arquivei sem querer.** Ative "mostrar arquivados" na seção correspondente e
**restaure**. Excluir de vez é outra ação, só para itens já arquivados e sem vínculos
(o app bloqueia com aviso se algo ainda aponta para o item).

**Marquei um check errado.** Desfaça — o evento é apagado (única exceção ao "nunca
excluir": erro de digitação não é memória).

**As revisões acumularam.** Atrasada conta como devida — sem multa, sem juros. Faça a
de hoje; as outras seguem esperando.

**Não acho uma nota.** Busca (título/texto), ou navegue pelos `@links`/backlinks no
web. *(A busca semântica — "o que já estudei sobre X" — é o Bloco T do plano.)*

**O calendário/agenda marcou o dia errado.** O **calendário** ainda calcula "este
mês" e o destaque de "hoje" no fuso do **dispositivo** (não no das Configurações), e
o dia da agenda é resolvido no servidor com o fuso configurado — mas com um fallback
divergente. Os dois pontos são correção conhecida e priorizada (task 75 do plano).
Se viajar de fuso, confira o relógio do aparelho.

**O botão "Gerar com IA" não aparece.** Configurações → Modo do assistente →
**conectado** — e confirme que `ANTHROPIC_API_KEY` está no `.env` do backend.

**Quero mudar o dia da revisão / horários.** Configurações. (Os horários de devocional
e reflexão ainda não disparam lembretes — vão ganhar função no plano, task 92.)
