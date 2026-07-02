# Tarefa 76 — JWT com expiração + refresh (Bloco Q)

> Origem: `docs/ANALISE-E-PLANO-MELHORIA.md` §4 e `docs/AJUSTES-MVP2.md` item 4.

## Objetivo

O token de login hoje **não expira** (`app.jwt.sign({sub})` sem `expiresIn`) — um vazamento
vale para sempre. Passa a valer **15 dias**, com **renovação deslizante**: qualquer
abertura do app com token ainda válido troca por um novo de 15 dias (`POST /auth/refresh`).
Sem tabela de sessões/refresh-token separado — adequado a single-user; revogação real fica
para quando houver multiusuário de verdade.

## Contrato

- `POST /auth/login` → `{ token }` com `exp` (15 dias).
- `POST /auth/refresh` (Bearer com token ainda válido) → `{ token }` novo; sem/expirado → 401.
- `shared/client`: `refreshSession()` em `endpoints.ts`; web e mobile chamam no boot
  quando há token salvo (`setToken` no sucesso; o 401 já desloga pelo client).

## Testes

- Integração (borda crítica): login devolve token com claim `exp` ≈ +15d; refresh com
  token válido → 200 e token novo (também com `exp`); refresh sem token → 401.
- Domínio: nada novo (não há regra de negócio — é borda).

## Definição de pronto

Token expira; refresh renova; fronts renovam no boot; suíte integração verde.

## Fora de escopo

Throttling de login (registrado em AJUSTES-MVP2); revogação por sessão; múltiplos
dispositivos com sessões independentes.
