# Tarefa 53 — G1: login (email+senha) + JWT (backend)

> **Bloco G — Autenticação**, parte 1. Adiciona senha ao `User`, um `login` que emite **JWT**, e
> registra `@fastify/jwt`. Decisões: email+senha→JWT; localStorage+Bearer (front, G3); só login
> (dono semeado, sem cadastro). A troca de `userId`-parâmetro por token em todas as rotas é a **G2**.

## Entrega

- Migração: `User.passwordHash String?` (aplicada: `20260607045945_add_user_password`).
- Deps: `@fastify/jwt`, `bcryptjs` (+ `@types/bcryptjs`).
- Domínio/ports: `domain/user.ts`; `ports/user-repository.ts` (findByEmail/byId);
  `ports/password-hasher.ts` (hash/compare). Erro `InvalidCredentialsError`.
- UseCase `AuthenticateUser` (TDD, fakes): valida email+senha; erro único (não vaza se email existe);
  normaliza email (trim+lowercase); JWT fica na borda.
- Impl: `PrismaUserRepository`, `BcryptPasswordHasher`.
- `shared/src/auth.ts`: `loginSchema` (email+password), `loginResponseSchema` ({token}).
- Rota `POST /auth/login` → 200 `{token}` (`app.jwt.sign({sub:userId})`) / 401 / 400 (Zod).
- `server.ts`: registra `@fastify/jwt` (secret de `JWT_SECRET`, default dev) + `authRoutes`.
- Seed: define `passwordHash` do dono (`SEED_OWNER_PASSWORD`, default `cerebro123`).

## Testes

- **Unit** `authenticate-user.test.ts` (5): válido; email normalizado; senha errada; email
  desconhecido; usuário sem senha. Todos → erro único nos casos negativos.
- **Rota** (integração): login válido → 200 token; senha errada → 401; email inválido → 400.
  (Cria um usuário próprio com hash bcrypt, não depende do owner.)

## Definição de pronto

- [x] Migração + deps + domínio/ports/usecase (TDD verde, 5).
- [x] Rota `POST /auth/login` + `@fastify/jwt` no server + seed com senha.
- [x] `prisma generate` ok; typecheck back limpo; unit **293** + integração **131** verdes; lint ok.
- [x] Reportar; G2 (rotas protegidas) e G3 (front) a seguir.

## Nota operacional

`prisma generate` falhou com EPERM (Windows) porque `dev:backend` e Prisma Studio seguravam o
engine. Parar esses processos → `pnpm --filter @cerebro/backend exec prisma generate` → typecheck/testes.
