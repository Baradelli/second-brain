# Tarefa 51 — E5: busca simples por texto

> **Bloco E**, item E5. Buscar por palavra em **notas** (título+texto), **recursos**
> (título+autor+descrição) e **capturas** (texto). Substring case-insensitive — NÃO é a busca
> semântica do MVP 4. Backend filtra em memória (volumes pessoais pequenos; sem mexer nos repos).

## Backend

- `SearchAll` (usecase, deps NoteRepository/ResourceRepository/CaptureRepository):
  `execute({ userId, query })` → `{ notes, resources, captures }`. `q = query.trim().toLowerCase()`;
  vazio → tudo vazio. Busca **ACTIVE** (notas/recursos) e **PENDING** (capturas), filtra por
  substring, ordena por `createdAt` desc, limita a 20 por grupo.
- `shared/src/search.ts`: `searchQuerySchema { userId, q: min 1 }`, `searchResultSchema`
  (reusa note/resource/capture response schemas).
- Rota `GET /search?userId&q` → 200 grupos; `q` vazio → 400 (Zod).

## Frontend

- `getSearch(q)` no client.
- **`SearchPage`** (`/search`): input com debounce; seções **Notas / Biblioteca / Capturas** com
  contagem; item navega (nota→`/editor/:id`, recurso→`/library/:id`, captura→`/review`). Estados
  "digite para buscar" e "nada encontrado".
- Navegação: ícone de **busca** no header → `/search`; item **"Buscar"** no sidebar.
- i18n pt/en (`nav.search`, `search.*`).

## Testes

- **Unit** `search-all.test.ts`: acha por título/texto/autor; case-insensitive; ignora
  ARCHIVED/PROCESSED e outro usuário; query vazia → vazio.
- **Rota** (integração): `GET /search?userId&q=` → 200 com os três grupos; sem `q` → 400.
- **UI** `search.test.tsx`: digitar chama `getSearch` e renderiza resultados; tocar navega.

## Definição de pronto

- [x] `SearchAll` (TDD, 5) + `GET /search` (200 + 400); `search*` em `shared/`.
- [x] `SearchPage` + `getSearch` + ícone no header + item no sidebar + i18n pt/en.
- [x] back unit **288** + rota (2), mobile **117** verdes; typechecks/lint limpos; sem regressões.
- [x] Marcar E5 e seguir para E7.
