# Tarefa 49 — E2: mostrar o recurso vinculado no fichamento

> **Bloco E**, item E2. Um fichamento (`STUDY_NOTE`) já guarda `resourceId`, mas nada na UI mostra
> a que recurso ele pertence. Exibir **"Fichamento · <recurso>"** na lista de Notas e no cabeçalho
> do editor. Só frontend — `getResource`/`listResources` já existem.

## Entrega

- **`NotesPage`**: carrega os recursos uma vez (`listResources`) → mapa `id→título`; em cada card de
  `STUDY_NOTE` com `resourceId`, anexa "· <título>" na linha do tipo (com `truncate`).
- **`EditorPage`**: captura o **tipo real** e o `resourceId` da nota carregada (hoje o cabeçalho usa
  só o `?type=` da query, que cai em `NOTE` ao abrir por id); quando o tipo efetivo for `STUDY_NOTE`
  e houver recurso, busca `getResource` e mostra o título no cabeçalho-ritual. Isso também corrige,
  de quebra, o ritual exibido ao abrir um fichamento/nota existente por id.

## Regras

- Recurso só aparece para `STUDY_NOTE`. Sem recurso conhecido (ex.: recurso arquivado fora da
  lista ACTIVE) → simplesmente não mostra (sem erro).
- Nenhuma chamada nova por nota: `NotesPage` usa **uma** busca de recursos e mapeia.

## Testes

- `notes.test.tsx`: um `STUDY_NOTE` com `resourceId` cujo recurso está na lista mostra o título do
  recurso no card.
- (Editor: coberto por verificação manual — fluxo visual.)

## Arquivos

- `packages/mobile/src/pages/NotesPage.tsx`, `packages/mobile/src/pages/EditorPage.tsx`.

## Definição de pronto

- [x] Notas: fichamentos mostram "Fichamento · <recurso>".
- [x] Editor: cabeçalho mostra o recurso (e o ritual reflete o tipo real da nota carregada).
- [x] `notes.test.tsx` verde; typecheck/lint limpos; mobile **113** sem regressões.
