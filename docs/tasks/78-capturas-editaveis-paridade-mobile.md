# Tarefa 78 — Capturas editáveis + paridade mobile de arquivar/restaurar (Bloco Q)

> Origem: `docs/ANALISE-E-PLANO-MELHORIA.md` §4 e `docs/AJUSTES-MVP2.md` itens 7–9.

## Objetivo

1. **Capturas editáveis** (não existia UPDATE de Capture em nenhuma camada): corrigir o
   texto de uma captura **PENDING** antes de promover/arquivar. Editar captura já
   processada/arquivada → 409 (`CaptureAlreadyProcessedError`) — o histórico de
   promoção não se reescreve.
2. **Paridade do mobile com o ADR 0004** (o web já tem tudo):
   - Restaurar captura arquivada na visão de arquivadas do `CapturePage` (a visão já
     existia, sem ação).
   - `LibraryPage`: toggle "Ver arquivados" com restaurar/excluir (padrão do
     `GoalsPage`; excluir bloqueado pelo backend com 409 se houver vínculos).
   - `ResourceDetailPage`: botão de arquivar no sheet de edição.

## Contrato

- `PATCH /captures/:id` body `{ text?, url?, labelIds? }` (Zod `editCaptureBodySchema`
  em `shared/`; `text` min 1) → 200 captura; 404 dono errado/inexistente; 409 não-PENDING.
- `shared/client`: `editCapture(id, body)`.
- UseCase `EditCapture` `{id, userId, text?, url?, labelIds?}` — owner guard (Tarefa 77).

## Testes

- Unit `edit-capture.test.ts`: edita texto/url; preserva demais campos; intruso →
  NotFound; inexistente → NotFound; PROCESSED/ARCHIVED → AlreadyProcessed.
- Integração: PATCH feliz + 409 após promover (em `agenda-routes.integration.test.ts`,
  onde já vive o fluxo de capturas).
- Mobile: editar captura chama `editCapture` e atualiza a lista; restaurar some da
  lista de arquivadas.

## Fora de escopo

Visões de arquivados no mobile para Notes/StudyItems/Publications (hoje só arquivam;
a restauração dessas fica para uma fatia própria — registrado no BACKLOG). Campo de
motivo ao arquivar captura na UI (a API aceita; tela fica para depois).
