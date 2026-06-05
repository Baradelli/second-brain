# Tarefa 39 — Tela Biblioteca (listar/criar `Resource`, filtros por stage/label)

> Abre o **Bloco M — Frontend** (mobile primeiro, PWA Vite + Tailwind + i18n). Substitui o
> placeholder atual de `LibraryPage`. Backend pronto (Tarefas 26–28). Segue o design system de
> `@cerebro/ui` e o padrão das páginas existentes (CSS vars, `useTranslation`, lucide-react).
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`** e olhe as páginas atuais
> (`AgendaPage.tsx`, `CapturePage.tsx`) para herdar o estilo.

## Método visual (lição do HANDOFF §4 — repetir sempre no frontend)

O funcional sai bem de spec textual; **o visual não**. Então:

1. Construir o funcional + estrutura, usando os componentes de `@cerebro/ui` e as CSS vars
   (`--cerebro-fg/-bg/-card/-accent/-muted/-border`, `--radius-card-lg`, sombras) — **nunca**
   cores/raios hardcoded nem CSS inline de layout novo fora do padrão.
2. **O dono é o QA do visual.** Se houver imagem de referência em `docs/design-refs/`, OLHAR a
   imagem e só então ajustar; sem referência, replicar o visual de `AgendaPage`. Não inventar
   um estilo novo.
3. Travar: mexer só na tela desta tarefa; rodar os testes.

## Objetivo

Tela de Biblioteca onde o dono lista seus `Resource` (livros/cursos/vídeos…), filtra por
**stage** (backlog / in_progress / done) e por **label**, e cria um novo recurso.

## Camada de dados (adicionar em `lib/api/endpoints.ts`)

Usar os schemas de `@cerebro/shared` (`resourceResponseSchema`, `createResourceSchema`,
`resourceType`, `resourceStage`) e os helpers `get`/`post`/`patch` + `CURRENT_USER_ID`:

```ts
listResources(params?: { stage?; labelId?; status? }): Promise<ResourceResponse[]>
  // GET /resources?userId=…&stage=…&labelId=…&status=ACTIVE (default ACTIVE)
createResource(body: { title; type; url?; author?; description?; labelIds? }): Promise<ResourceResponse>
  // POST /resources
editResource(id, body): Promise<ResourceResponse>   // PATCH /resources/:id (p/ mover stage)
listLabels(): Promise<LabelNode[]>                   // GET /labels (árvore; achatar p/ o filtro)
```

## UI

- **Cabeçalho** no padrão (título `t('nav.library')` com `font-display`).
- **Filtro por stage**: linha de `Chip` (`@cerebro/ui`) — Todos / Backlog / Lendo / Concluído
  (rótulos via i18n). Selecionado destaca com `--cerebro-accent`.
- **Filtro por label** (opcional na primeira versão): `Chip`/`LabelChip` a partir de
  `listLabels`. (Ver decisão — pode ficar para um polimento.)
- **Lista**: `Card` por recurso — título, tipo (ícone lucide por tipo), autor, e um indicador de
  stage. Toque no card permite **avançar o stage** (ex.: bottom sheet ou ciclo
  backlog→in_progress→done via `editResource`). (Ver decisão.)
- **Criar**: botão FAB/`Button` abre um `BottomSheet` com formulário (React Hook Form +
  `@hookform/resolvers/zod` validando com `createResourceSchema`): título (default vazio),
  tipo (select), url/autor/descrição opcionais, labels.
- **Estados**: loading (padrão `LoadingDots` da Agenda), erro (`t('library.error')`), vazio
  (`EmptyState` com ícone `BookOpen`).
- **i18n**: chaves novas em `locales/pt.json` e `en.json` (`library.*`, `resource.stage.*`,
  `resource.type.*`). Nada de texto solto.

## Decisões que assumi (revisar)

- **Filtro por label entra nesta tela** mas, se quiser enxugar, mando só stage agora e label
  num polimento. (Backend já suporta `labelId`.)
- **Avançar stage por toque** (ciclo) em vez de uma tela de edição completa — mais rápido no
  mobile. Edição completa de um recurso fica para depois (ou no mesmo BottomSheet).
- **Sem paginação** (lista simples) — volume pessoal é baixo no MVP.

## Testes (Vitest + Testing-library — só fluxos que quebram em silêncio)

`src/__tests__/library.test.tsx` (mockando `endpoints` e `@cerebro/ui` como nos testes atuais):

- renderiza a lista a partir de `listResources` mockado;
- filtro por stage chama `listResources` com o stage certo (ou filtra client-side, ver impl);
- criar recurso chama `createResource` com o corpo correto e atualiza a lista;
- estado vazio quando a lista volta `[]`.

Não testar pixels/estilo (é QA do dono).

## Arquivos a tocar

- `packages/mobile/src/pages/LibraryPage.tsx` (substitui o placeholder).
- `packages/mobile/src/lib/api/endpoints.ts` (+resources +labels).
- `packages/mobile/src/locales/pt.json` e `en.json` (+chaves).
- `packages/mobile/src/__tests__/library.test.tsx` (novo).
- Componente de form, se extraído (`components/ResourceForm.tsx`).
- **Não** tocar: backend, outras telas.

## Fora de escopo

- Goals (40), fechar-o-dia (41), promoção (42).
- Arquivar/editar avançado de recurso (além de mover stage), busca, paginação.

## Definição de pronto

- [ ] Biblioteca lista recursos (loading/erro/vazio), filtra por stage (e label, se incluído),
      e cria recurso via formulário validado por Zod.
- [ ] Tudo via `@cerebro/ui` + CSS vars + i18n (sem texto solto, sem cor hardcoded).
- [ ] Testes dos fluxos (lista/criar/filtro/vazio) verdes; suíte do mobile verde.
- [ ] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar e **parar**.
