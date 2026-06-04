# Tarefa 21 — Tela de captura + revisão (lista de pendentes, arquivar/promover)

## Objetivo

A tela de captura rápida (textarea, atrito zero) e a fila de revisão: listar pendentes,
arquivar ou promover para nota. É o segundo pilar do MVP 1 na UI.

## Camada(s)

Frontend (mobile). Consome `POST /captures`, `GET /captures?status=`,
`POST /captures/:id/archive`, `POST /captures/:id/promote`.

## Pré-requisitos

- Tarefas 19, 19b, 20 (usar os componentes-base e o tema da 19b).
- Backend de captura/revisão pronto (Blocos C/D/E).

## Política de testes (frontend)

Leve. Cobrir: capturar envia o texto certo; arquivar/promover removem da fila e refletem o
resultado. O resto, validar usando.

## Funcionalidade

1. **Captura rápida:** uma **textarea** (texto puro, multilinha) sempre acessível —
   idealmente um botão/atalho de captura presente em todas as telas (atrito mínimo). Enviar
   cria a captura (`status PENDING`, `reviewAt` padrão calculado no backend). Labels são
   opcionais (não travam a captura).
2. **Fila de revisão:** lista as capturas pendentes (`GET /captures?status=PENDING`), cada
   uma com o texto e as ações:
   - **Arquivar** (com motivo opcional) → `POST /captures/:id/archive`.
   - **Promover para nota** → `POST /captures/:id/promote` (escolher o `type`); ao promover,
     pode abrir a nota recém-criada no editor (Tarefa 20).
3. **Arquivo:** uma visão de "mostrar arquivados" (`GET /captures?status=ARCHIVED`), separada
   da fila do dia a dia.
4. **Mobile-first:** ações por toque, lista cômoda no celular.

## Tom (princípio anti-culpa)

A fila de revisão é convite, não cobrança. Nada de "você tem 12 capturas atrasadas!" em tom
de dívida — apresentar como "para revisar".

## Fora de escopo

- NÃO promover para resource/goal (MVP 2).
- NÃO juntar com a agenda ainda (Tarefa 22).
- NÃO offline (Tarefa 24).

## Definição de pronto

- [ ] Captura rápida (textarea) acessível e funcional; envia e some do input.
- [ ] Fila de pendentes lista e permite arquivar/promover, atualizando a lista.
- [ ] Visão de arquivados disponível.
- [ ] Promover abre/cria a nota no editor.
- [ ] Testes mínimos dos fluxos críticos.
- [ ] Reporte ao dono: arquivos tocados + checklist marcado.
