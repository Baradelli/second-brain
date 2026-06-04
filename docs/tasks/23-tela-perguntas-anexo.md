# Tarefa 23 — Painel "perguntas sugeridas" + anexar foto no editor

## Objetivo

Completar a tela do editor com dois recursos: o painel de perguntas-guia (sob demanda,
agrupadas por label) e o anexo de foto (ex.: página manuscrita). Fecha o Bloco G.

## Camada(s)

Frontend (mobile). Consome `GET /notes/suggested-questions?labelIds=...` (Tarefa 17) e
`POST /notes/:id/attachments` + `GET /notes/:id/attachments` (Tarefa 18).

## Pré-requisitos

- Tarefas 20 (editor), 16/17 (labels + perguntas), 18 (anexos).

## Política de testes (frontend)

Leve. Cobrir: o painel mostra as perguntas agrupadas; anexar exibe o anexo na nota.

## Funcionalidade

1. **Perguntas sugeridas:** um **botão** no editor que abre um painel com as perguntas dos
   labels da nota, **agrupadas por label**. Só consulta — não vira campo obrigatório, não
   escreve nada na nota automaticamente. Labels sem pergunta não aparecem.
2. **Anexar foto:** anexar uma imagem (ou arquivo) à nota — guardar via
   `POST /notes/:id/attachments` (URL + metadados). Exibir os anexos da nota
   (`GET /notes/:id/attachments`).
   - **Upload:** o backend recebe uma `url` (a Tarefa 18 não cobre o upload em si). Esta
     tarefa precisa de uma forma de obter essa URL — decidir o mecanismo de upload/storage
     (ver decisão em aberto no plano). Se ainda indefinido, **perguntar ao dono** antes de
     implementar; não inventar um storage.
3. **Mobile-first:** anexar foto deve aproveitar a câmera/galeria do celular quando possível.

## Tom

As perguntas são andaime para pensar — apresentar como ajuda, opcional. A nota segue livre.

## Fora de escopo

- NÃO OCR/transcrição (MVP 5) — só guardar a imagem.
- NÃO herança de perguntas pela árvore (a menos que decidido na Tarefa 17).
- NÃO offline (Tarefa 24).

## Definição de pronto

- [x] Botão "perguntas sugeridas" abre painel agrupado por label, só com labels que têm pergunta.
- [x] Anexar imagem à nota e listar anexos funciona.
- [x] Mecanismo de upload definido (decisão do dono: disco do servidor — `POST /uploads`) — sem storage inventado.
- [x] Testes mínimos dos dois fluxos.
- [x] **Com isso o Bloco G encerra** — falta só o Bloco H (offline Nível 1).
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
