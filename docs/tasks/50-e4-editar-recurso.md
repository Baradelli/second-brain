# Tarefa 50 — E4: editar um recurso pela UI

> **Bloco E**, item E4 (parte que faltava — objetivos já no Bloco F; nota tem excluir). Hoje a UI
> só **cicla o estágio** de um recurso. Permitir **editar** título/tipo/autor/link/labels pela
> tela de detalhe do recurso. Backend `editResource` (`PATCH /resources/:id`) já existe.

## Entrega

- **`ResourceForm`**: modo edição (`initial?: ResourceResponse`) — preenche título/tipo/autor/link e
  labels; em edição, envia `labelIds` sempre (permite limpar). Título do form muda para "Editar".
- **`ResourceDetailPage`**: botão **"Editar"** no topo → BottomSheet com `ResourceForm` preenchido;
  ao salvar, chama `editResource(id, body)` e atualiza o recurso na tela.

## i18n

`library.edit` ("Editar"/"Edit"), `library.edit.title` ("Editar recurso"/"Edit resource").

## Testes (`resource-detail.test.tsx`)

- abrir "Editar" mostra o form preenchido; salvar chama `editResource(id, { title: ... })`.

## Arquivos

- `packages/mobile/src/components/ResourceForm.tsx`, `packages/mobile/src/pages/ResourceDetailPage.tsx`,
  `locales/{pt,en}.json`, `__tests__/resource-detail.test.tsx`.

## Definição de pronto

- [x] `ResourceForm` editável; botão Editar na detail page abre form preenchido e salva.
- [x] i18n pt/en; `resource-detail.test.tsx` (6) verde; typecheck/lint limpos; mobile **114** sem regressões.
- [x] Reportar e seguir para E5.
