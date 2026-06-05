# Tarefa 41 — Tela "Fechar o dia" (fiz / não fiz porque… / deixa pra lá)

> Continua o **Bloco M**. A tela onde **mora o tom anti-culpa**: recapitulação do dia, nunca
> auditoria. Backend pronto (`GET /day-closing` na Tarefa 36; check/skip na 32/33/35). Mesmo
> método visual das anteriores.

## Princípio (inegociável — guia o tom e a UX)

"Fechar o dia" é **ritual de recapitulação, jamais cobrança**. Os textos, ícones e microcópia
enquadram cada item como convite/conquista — **nunca** falha. "Deixa pra lá" é uma saída
tranquila e **não grava nada**. Ver `CLAUDE.md` e HANDOFF (princípio anti-culpa). O dono é QA
do tom também — deixar a microcópia fácil de ajustar (tudo em i18n).

## Objetivo

Tela `/day-closing` que lista os pendentes de hoje (de `GET /day-closing`) e, para cada um,
oferece três ações:

- **Fiz** → `checkGoal(id)` (HABIT: 1 toque; se algum dia houver TARGET aqui, value — mas a 36
  só manda HABIT).
- **Não fiz porque…** → abre um campo de motivo e chama `skipGoal(id, { reason })` (reason
  **obrigatório**; sem julgamento no texto).
- **Deixa pra lá** → apenas remove o item da lista na sessão; **nenhuma chamada ao backend**.

## Camada de dados (adicionar em `endpoints.ts`)

Schemas de `@cerebro/shared` (`dayClosingResponseSchema`, `skipGoalSchema`, `eventResponseSchema`):

```ts
getDayClosing(): Promise<DayClosingResponse>                 // GET /day-closing?userId=…&day=today
checkGoal(id): Promise<EventResponse>                        // POST /goals/:id/check (reusar da 40)
skipGoal(id, reason: string): Promise<EventResponse>         // POST /goals/:id/skip
```

(`checkGoal` pode já existir da Tarefa 40; reusar.)

## UI

- **Cabeçalho** acolhedor (`t('dayClosing.title')`, subtítulo contemplativo em itálico
  `Fraunces`, no estilo do header da Agenda).
- **Lista de pendentes**: `Card` por item — título, e um selo discreto se é `scheduled` ou
  `invitation` (convite "se quiser", tom leve). Três ações (Button/ícones): **fiz** (check
  verde), **não fiz porque…** (abre input inline/bottom sheet de motivo → skip), **deixa pra
  lá** (texto-link discreto que só descarta na UI).
- Ao resolver um item (fiz/skip/deixa), ele sai da lista com animação suave; quando a lista
  esvazia, **estado de "dia fechado"** — mensagem calorosa (`EmptyState`/ilustração simples),
  **sem placar de acertos/erros**.
- **Estados**: loading/erro; vazio inicial = "nada pendente, dia leve" (não "você não fez nada").
- **i18n**: `dayClosing.*` (título, subtítulo, ações `did`/`didntBecause`/`skip`, placeholder do
  motivo, mensagem de dia fechado) em pt/en. Microcópia anti-culpa.

## Navegação (decisão)

Rota `/day-closing`, acessada por um **CTA na Agenda** (ex.: à noite, ou sempre um card
"Fechar o dia"). Sem mexer na tab bar (cheia). (Ver decisão.)

## Decisões que assumi (revisar)

- **CTA na Agenda** abre `/day-closing` (sem aba fixa). Se quiser que apareça só à tarde/noite,
  condiciono pelo horário; por ora mostro sempre.
- **"Deixa pra lá" é só client-side** nesta sessão (não grava, não esconde permanentemente) —
  fiel à decisão "não grava nada". Reabrir a tela mostra o item de novo (até ser feito/pulado).
- **Motivo do skip**: input curto obrigatório; sem sugestões prontas (evita enquadrar como
  desculpa padronizada). 1 motivo por skip.
- Só HABIT aparece (o backend da 36 manda só HABIT).

## Testes (só fluxos que quebram em silêncio)

`src/__tests__/day-closing.test.tsx`:

- lista pendentes de `getDayClosing` mockado;
- "fiz" chama `checkGoal(id)` e remove o item;
- "não fiz porque…" exige motivo e chama `skipGoal(id, reason)`; sem motivo não envia;
- "deixa pra lá" remove o item **sem** chamar backend;
- lista vazia mostra o estado "dia fechado" (sem placar).

## Arquivos a tocar

- `packages/mobile/src/pages/DayClosingPage.tsx` (novo) + rota em `router.tsx`.
- `packages/mobile/src/pages/AgendaPage.tsx` (CTA "Fechar o dia").
- `endpoints.ts` (+day-closing/skip), `locales/*` (+chaves anti-culpa), testes.
- **Não** tocar: backend, biblioteca (39), promoção (42).

## Fora de escopo

- Métricas/streaks/placar (MVP 3 — e contrário ao princípio aqui).
- Desfazer um skip pela tela; incluir TARGET/PROJECT no fechar-o-dia.

## Definição de pronto

- [ ] `/day-closing` lista pendentes e resolve cada um como fiz (check) / não fiz porque…
      (skip + motivo obrigatório) / deixa pra lá (só UI, sem backend).
- [ ] Tom anti-culpa em toda a microcópia (i18n), estado "dia fechado" sem placar.
- [ ] CTA na Agenda abre a tela; `@cerebro/ui` + CSS vars + i18n.
- [ ] Testes dos fluxos verdes; suíte do mobile verde.
- [ ] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar e **parar**.
