# Tarefa 45 — Tela de calendário mensal (mobile)

> **Bloco D — Calendário com metas reais**, tarefa D2. A tela que consome o agregador da D1
> (`GET /calendar`): um **calendário mensal navegável** onde cada dia marca **metas previstas ×
> cumpridas** e o **selo de diário**. Ocupa o slot da aba **"Assistente"** (decisão E6). Detalhe
> rico do dia (metas individuais + notas + ações) é a **D3** — aqui o toque num dia abre só um
> **resumo leve** (do dado já carregado), sem novo endpoint. Decisões em `docs/MELHORIAS.md`.

## Decisões do bloco (já fechadas)

- Marcar no dia: **metas previstas × cumpridas** + **selo de diário** (devocional/reflexão).
- **Substitui a aba "Assistente"** na tab bar (a página `AssistantPage`/rota continua existindo,
  só sai da navegação).
- **Só navegar/visualizar** — sem streaks/percentuais (MVP 3).

## Estado atual (reaproveitar)

- API client em `lib/api/endpoints.ts` (helpers `get` zod-validados, `CURRENT_USER_ID`).
- `calendarMonthResponseSchema` / `CalendarMonthResponse` já existem em `@cerebro/shared` (D1).
- Componentes `@cerebro/ui`: `Card`, `BottomSheet`, `EmptyState`, `Button`, `SectionHeader`.
- Padrão de página: `GoalsPage` (load/loading/error, `useTranslation`, BottomSheet).
- i18n em `locales/pt.json` + `locales/en.json` (chaves semânticas em inglês).
- Luxon **não** está no mobile → datas de layout com `new Date(y, m-1, d)` (trivial, local).

## Entrega

1. **API**: `getCalendar(month?: string): Promise<CalendarMonthResponse>` →
   `GET /calendar?userId=…[&month=YYYY-MM]`.
2. **`CalendarPage`** (`pages/CalendarPage.tsx`, rota `/calendar`):
   - Cabeçalho: título do mês (ex.: "junho de 2026", via `toLocaleDateString` no locale do i18n) +
     **‹ ›** para mês anterior/próximo + botão **"Hoje"** (volta ao mês corrente).
   - **Grade**: 7 colunas (domingo→sábado), cabeçalho de dias da semana (narrow, via `Intl`),
     células de offset vazias antes do dia 1, uma célula por dia do mês.
   - **Célula do dia**: número do dia; se `goalsPlanned > 0` mostra **`{done}/{planned}`**
     (se `planned === 0 && done > 0`, mostra `{done}` com marcador "feito"); um **ponto de
     diário** quando `devotional || reflection`. Dia de **hoje** destacado.
   - Tocar um dia → **BottomSheet** com resumo daquele dia (data por extenso; metas
     cumpridas/previstas; selos devocional e reflexão como ✓/○). **Sem** novo fetch.
   - `loading` / `error` no padrão das outras telas.
3. **Navegação**: trocar a aba `/assistant` (ícone `Sparkles`) por **`/calendar`** (`CalendarDays`,
   label `nav.calendar`) em `App.tsx`; adicionar a rota em `router.tsx`.
4. **i18n**: chaves `nav.calendar`, `calendar.*` em pt e en.

## i18n (chaves novas)

`nav.calendar`, `calendar.title`, `calendar.loading`, `calendar.error`, `calendar.prevMonth`,
`calendar.nextMonth`, `calendar.today`, `calendar.day.goals` (`{{done}}/{{planned}}`),
`calendar.day.goalsSummary` (`{{done}} de {{planned}} metas`), `calendar.day.goalsDoneOnly`
(`{{done}} cumprida(s)`), `calendar.day.noGoals`, `calendar.day.journal`,
`calendar.day.devotional`, `calendar.day.reflection`.

## Testes (`__tests__/calendar.test.tsx`, só o que quebra em silêncio)

- Renderiza o título do mês e as células do mês (mock `getCalendar` → fixture de junho/2026).
- Um dia com `goalsPlanned/Done` mostra o marcador `{done}/{planned}`.
- Tocar num dia abre o BottomSheet com o resumo (metas + selos).
- **‹ ›** chamam `getCalendar` com o mês deslocado (anterior/próximo).
- Estado de erro quando `getCalendar` rejeita.

(Mock `@cerebro/ui` como nas outras specs: `BottomSheet` renderiza children quando `open`.)

## Arquivos a tocar

- `packages/mobile/src/lib/api/endpoints.ts` (+`getCalendar`).
- `packages/mobile/src/pages/CalendarPage.tsx` (novo).
- `packages/mobile/src/App.tsx` (troca aba) + `router.tsx` (+rota `/calendar`).
- `packages/mobile/src/locales/{pt,en}.json` (+chaves).
- `packages/mobile/src/__tests__/calendar.test.tsx` (novo).
- **Não** tocar: backend, schema (D1 já pronto), D3.

## Definição de pronto

- [x] `getCalendar` no client; `CalendarPage` com grade mensal, navegação de mês e marcação
      (metas + diário) por dia.
- [x] Aba "Assistente" → "Calendário" na tab bar; rota `/calendar`.
- [x] Toque no dia abre resumo (BottomSheet) do dado já carregado.
- [x] i18n pt/en; sem texto solto.
- [x] Testes da tela verdes (4); typecheck mobile/ui limpo; suíte mobile **100** sem regressões; lint ok.
- [x] Marcar D2 em `MELHORIAS.md` e reportar (parar antes da D3).
