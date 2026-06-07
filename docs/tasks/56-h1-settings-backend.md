# Tarefa 56 — H1: configurações (backend)

> **Bloco H — Configurações**, parte 1. O `Settings` já existe na tabela e é **lido** em todo
> lugar (timezone, reviewWeekday, recapWeekday…), mas **não há caminho de escrita**. Aqui: ler e
> gravar via `GET /settings` e `PATCH /settings`, por token (G2). Tela é a H2.

## Entrega

- `domain/settings.ts`: entidade `Settings` (userId + reviewWeekday/recapWeekday/timezone/
  devotionalTime/reflectionTime).
- `ports/settings-repository.ts`: `getByUserId` + `upsert(userId, patch)`. Fake + Prisma.
- UseCases (TDD): `GetSettings` (devolve a do usuário; se não houver, **defaults** sem persistir) e
  `UpdateSettings` (valida já na borda via Zod; faz upsert do patch).
- `shared/src/settings.ts`: `settingsResponseSchema` + `updateSettingsSchema` (weekday 0–6,
  timezone não-vazio, horários `HH:mm`).
- Rotas (escopo protegido): `GET /settings` → 200; `PATCH /settings` → 200 / 400 (Zod).

## O que o Settings afeta (contexto)

- **timezone**: todo cálculo de dia/semana/mês (agenda, fechar o dia, calendário, recap, progresso,
  agendamento da captura).
- **reviewWeekday**: dia pro qual a captura é agendada pra revisão.
- **recapWeekday**: início da semana do recap semanal.
- **devotionalTime/reflectionTime**: ainda **não usados** pelo app (campos pro futuro).

## Testes

- **Unit**: `GetSettings` (existente → retorna; ausente → defaults). `UpdateSettings` (upsert do
  patch; preserva campos não enviados).
- **Rota** (integração, usuário próprio pra não mexer no owner): GET → 200 com os campos;
  PATCH timezone+weekday → 200 refletido; horário inválido → 400.

## Definição de pronto

- [x] `Settings` domínio + `SettingsRepository` (port + fake + Prisma).
- [x] `GetSettings`/`UpdateSettings` (TDD, 4) + `settings*` em `shared/`.
- [x] `GET/PATCH /settings` no escopo protegido (token; 401 sem token; 400 horário inválido).
- [x] unit **297** + integração **135** verdes; typecheck/lint limpos. H2 (tela) a seguir.
