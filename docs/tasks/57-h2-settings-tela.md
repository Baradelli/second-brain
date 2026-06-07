# Tarefa 57 — H2: tela de Configurações (frontend)

> **Bloco H — Configurações**, parte 2 (fecha o bloco e o MVP 2). Tela que lê/grava o Settings
> via `GET/PATCH /settings` (H1), com texto explicando o que cada opção afeta.

## Entrega

- Client: `getSettings()` e `updateSettings(patch)`.
- **`SettingsPage`** (`/settings`): carrega o Settings e edita:
  - **Fuso horário** (select; usa `Intl.supportedValuesOf('timeZone')` com fallback) — _afeta todo
    cálculo de dia/semana/mês_.
  - **Dia de revisar capturas** (`reviewWeekday`) — dia pro qual a captura é agendada.
  - **Início da semana (recap)** (`recapWeekday`).
  - **Horário do devocional/reflexão** — com aviso de que ainda não são usados (futuros lembretes).
  - Botão **Salvar** (PATCH) + indicador "Salvo". Cada campo tem legenda do impacto.
- Acesso: item **"Configurações"** no sidebar.
- i18n pt/en (`nav.settings`, `settings.*`).

## Testes

- `settings.test.tsx`: carrega, altera o fuso e salva (chama `updateSettings`); estado de erro.

## Definição de pronto

- [x] `getSettings`/`updateSettings`; `SettingsPage` com os campos + legendas de impacto.
- [x] Item no sidebar + rota `/settings`; i18n pt/en.
- [x] `settings.test.tsx` (2) verde; mobile **123**; typecheck/lint limpos.
- [x] **Bloco H fechado → MVP 2 finalizado** (login + rotas por token + configurações).
