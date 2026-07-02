# Tarefa 75 — Fuso unificado (Bloco Q)

> Origem: `docs/ANALISE-E-PLANO-MELHORIA.md` §4 (Bloco Q) e `docs/AJUSTES-MVP2.md` itens 1–3.

## Objetivo

Uma só noção de "hoje" e uma só noção de "início de semana" no app inteiro:

1. **Fallback de timezone único.** Hoje coexistem `UTC` (`build-today-agenda.ts`,
   `study-item-routes.ts`) e `'America/Sao_Paulo'` (6 outros pontos). Passa a existir
   UMA constante, exportada de `shared/` (`FALLBACK_TIMEZONE`) e reusada pelo
   `domain/settings.ts` do backend (`DEFAULT_TIMEZONE`).
2. **Calendário do front no fuso do Settings.** `currentMonthKey`/`todayKey` (web,
   Luxon local) e os `new Date()` do `CalendarPage` (mobile) passam a usar helpers puros
   de `shared/` (`todayISO(tz)`, `currentMonthISO(tz)`, `shiftMonth`) alimentados pelo
   `Settings.timezone` (via `getSettings`).
3. **Início de semana único = `Settings.recapWeekday`** (default 0 = domingo, o mesmo
   do `DEFAULT_SETTINGS`). Morrem as outras duas noções: o default fixo `1` (segunda)
   em `day-range`/`upsert-journal-note` e o uso indevido de `reviewWeekday` no
   `recap-routes.ts:67`. A porta `SettingsReader` ganha `recapWeekday`;
   `compute-goal-progress` e `select-todays-goals` recebem/usam o valor.
4. **`.env.example`** ganha `JWT_SECRET` e `ANTHROPIC_API_KEY` (comentados).

## Contrato

- `shared`: `todayISO(timezone, now?) → 'YYYY-MM-DD'`, `currentMonthISO(timezone, now?)
  → 'YYYY-MM'`, `shiftMonth('YYYY-MM', delta)`, `FALLBACK_TIMEZONE`. Puros, sem
  dependência (via `Intl.DateTimeFormat`; Luxon continua sendo a lib do backend).
- `SelectTodaysGoalsInput` e `ComputeGoalProgress` passam a considerar `weekStartsOn`
  vindo do Settings (`recapWeekday`), com fallback no default do domínio.

## Testes

- `shared/src/__tests__/local-day.test.ts`: dia/mês corretos dos dois lados da meia-noite
  de SP (UTC-3), `shiftMonth` com virada de ano, fallback exportado.
- Backend: `build-today-agenda` cai para `America/Sao_Paulo` sem Settings (era UTC);
  janela semanal de HABIT respeita `recapWeekday`; recap semanal usa `recapWeekday`
  (não `reviewWeekday`).
- Web/mobile: testes de calendário atualizados para o fuso vindo do Settings.

## Definição de pronto

Todos os fallbacks apontam para a mesma constante; nenhuma tela calcula dia/mês com
fuso do dispositivo; semana = `recapWeekday` em recap, hábitos semanais e convites de
período; `.env.example` documenta as duas chaves; suíte unit verde nos 4 pacotes.

## Fora de escopo

Saudação por hora local do relógio (UX correta); refresh de JWT (task 76); lembretes
de devocional/reflexão (task 92).
