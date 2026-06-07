# Tarefa 55 — G3: login no frontend (token + guarda + 401)

> **Bloco G — Autenticação**, parte 3 (fecha o bloco). Tela de login, token no localStorage,
> `Authorization: Bearer` em todo request, 401 → desloga, guarda de rota, e remoção do
> `CURRENT_USER_ID` fixo (o backend deriva o usuário do token).

## Entrega

- **`lib/auth.ts`**: `getToken`/`setToken`/`clearToken`/`isAuthenticated`/`logout` (localStorage).
- **`lib/api/client.ts`**: anexa `Authorization: Bearer <token>` em `request`/`del`; resposta
  **401** → `clearToken()` + redireciona para `/login` (sem loop na própria tela). Removido o
  `export const CURRENT_USER_ID`.
- **`endpoints.ts`**: `login(email, password)`; **todos** os requests pararam de mandar `userId`
  (o backend ignora/deriva do token). `del('/events/:id', {})` manda corpo vazio.
- **`LoginPage`** (`/login`): RHF (email+senha) → `login` → `setToken` → `navigate('/')`; erro →
  mensagem. i18n `login.*`.
- **Guarda**: `RequireAuth` no `router` — sem token, qualquer rota redireciona a `/login`;
  `/login` é pública.
- **Logout**: `Sidebar` ganhou slot `footer`; `App` põe um botão **"Sair"** que chama `logout()`.

## Testes

- `login.test.tsx`: login OK → `setToken` + navega; login falho → mensagem de erro, sem token.

## Definição de pronto

- [x] Token no client (Bearer) + 401→logout; `CURRENT_USER_ID` removido (sem `userId` nos requests).
- [x] `LoginPage` + guarda `/login`/RequireAuth + logout no sidebar; i18n pt/en.
- [x] `login.test.tsx` (2) verde; mobile **121** sem regressões; typecheck mobile/ui limpo; lint ok.
- [x] **Bloco G (auth) fechado.** Falta o Bloco H (Configurações) para encerrar o MVP 2.

## Nota pro dono

Para logar de verdade: rode o seed uma vez (`pnpm --filter @cerebro/backend run seed`) para o
`owner@cerebro.local` ganhar senha (`SEED_OWNER_PASSWORD`, default `cerebro123`). E defina
`JWT_SECRET` no ambiente do backend em produção.
