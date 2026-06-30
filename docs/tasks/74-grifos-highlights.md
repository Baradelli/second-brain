# Tarefa 74 — Grifos (Highlights) por Recurso + paleta global de cores

> Cada Recurso ganha, além dos Fichamentos, uma **tabela de grifos** (marca-textos): cada
> linha tem uma **cor com significado**, a frase grifada, um comentário (texto simples) e um
> local opcional. O significado das cores é uma **paleta global** do usuário, customizável.
> Vale para **web e mobile**. Decisões de design no plano e no **ADR 0005**; verbetes no
> `CONTEXT.md`.
>
> **Antes de começar, leia `CLAUDE.md` e `CONTEXT.md`.** Ciclo TDD outside-in obrigatório.

## Objetivo

Registrar de forma estruturada o que o dono grifou numa leitura, com cores que carregam
significado (amarelo = interessante, rosa = importante, azul = pesquisar a fonte, verde = novo
tópico, laranja = pôr em prática). Entrada **manual** (funciona para livro físico), desacoplada
do editor TipTap. O comentário do grifo *é* a nota ancorada — não há Note separada.

## Modelo

- Entidade **`Highlight`** `{ id, userId, resourceId, colorId, location?, quote, comment?,
  status, archivedAt, createdAt }`. Segue a convenção de arquivamento (ADR 0004).
- **`Settings.highlightColors`**: `Array<{ id, color, name, order }>` (JSONB). `colorId` do
  grifo referencia o `id` estável. Paleta efetiva cai num **seed** de 5 cores quando vazia
  (ver `effectiveHighlightColors`). **Ver ADR 0005** para o porquê de não ser entidade própria.

## Backend (TDD: teste do usecase primeiro, com fake)

- Domínio: `domain/highlight.ts`, erros em `domain/errors.ts`, `HighlightColor` +
  `DEFAULT_HIGHLIGHT_COLORS` + `effectiveHighlightColors` em `domain/settings.ts`.
- Port + fake: `ports/highlight-repository.ts` (com `countByColor`), `_fakes/…`.
- Usecases de grifo: `create` (valida `quote` e `colorId` na paleta efetiva via
  `SettingsRepository`), `edit`, `list`, `archive`, `unarchive`, `delete` (só se arquivado).
- Usecases de paleta: `list/add/edit/remove-highlight-color` (operam sobre a paleta efetiva;
  `remove` bloqueia se `countByColor` > 0 → `HighlightColorInUseError`).
- `DeleteResource` passa a bloquear se há grifos apontando para o recurso.
- Prisma: `model Highlight` + `Settings.highlightColors Json` + relação em `Resource`/`User`;
  **migração gerada pelo Prisma** (`migrate dev`); `prisma-highlight-repository.ts`;
  `prisma-settings-repository.ts` lê/grava `highlightColors`.
- Rotas: `highlight-routes.ts` (`/highlights` CRUD + archive/unarchive/delete) registrada no
  `server.ts`; `settings-routes.ts` ganha `GET/POST/PATCH/DELETE /settings/highlight-colors`
  (DELETE → 409 se em uso).
- Contrato: `prisma-highlight-repository.integration.test.ts`.

## Shared

- `shared/highlight.ts` (create/edit/list/response schemas). `shared/settings.ts`:
  `highlightColorSchema` + `add/editHighlightColorSchema`. Export no index.
- `client/endpoints.ts`: `listHighlights/getHighlight/createHighlight/editHighlight/
  archiveHighlight/unarchiveHighlight/deleteHighlight` + `listHighlightColors/
  addHighlightColor/editHighlightColor/removeHighlightColor`.
- i18n pt/en: `resource.highlights.*`, `highlight.field.*`, `highlight.delete.*`,
  `settings.highlightColors.*` (com `inUse_one/_other`).

## Frontend

- **Web**: `HighlightsSection` no `ResourceDetailTab` (chips de cor com swatch + nome,
  edição inline, disclosure de arquivados); `HighlightColorsEditor` no `SettingsTab`.
- **Mobile**: `HighlightsSection` (cards + BottomSheet) no `ResourceDetailPage`;
  `HighlightColorsEditor` na `SettingsPage`.
- Acessibilidade: cor **nunca** sozinha — sempre swatch + nome (impeccable).

## Definição de pronto

- [x] Usecases de grifo e de paleta cobertos por testes (unit, fake): `quote` vazio rejeitado;
      `colorId` fora da paleta → erro; remover cor em uso → bloqueio; delete só se arquivado.
- [x] Teste de contrato do `PrismaHighlightRepository` (CRUD + `countByColor`) verde.
- [x] Migração criada **pelo Prisma** e banco em sincronia; suíte completa do backend verde
      (unit + integração).
- [x] Web: criar/editar/arquivar grifo, filtrar por cor, editar a paleta no Settings (bloqueio
      ao remover cor em uso). Typecheck e testes do web verdes.
- [x] Mobile: mesma jornada em cards. Typecheck dos arquivos da feature limpo; testes verdes.
- [x] `CONTEXT.md` (verbetes Grifo + Paleta) e **ADR 0005** escritos.
