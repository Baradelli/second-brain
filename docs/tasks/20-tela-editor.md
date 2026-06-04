# Tarefa 20 — Tela do editor (TipTap)

## Objetivo

A tela de escrita com TipTap, sobre o layout do protótipo de referência. Cria/edita uma Note
(devocional, reflexão, fichamento, nota), salvando `doc` (JSON do TipTap) — o `plainText` é
derivado no backend. É a peça central do app (a primeira que o dono quis).

## Camada(s)

Frontend (mobile). Consome `POST /notes`, `GET /notes`, e os UseCases de editar/buscar-do-dia
via API.

## Pré-requisitos

- Tarefa 19 (base) e **19b (sistema de design + componentes-base + tema)** — usar os tokens,
  o `Card`, a tipografia e o tema da 19b. A 19b é a referência visual oficial.
- Backend de Note pronto (Blocos A/B).
- Clima da escrita: o respiro editorial (serifa nos momentos contemplativos) vem da 19b;
  a área de escrita deve ser confortável e silenciosa. Agora com Tailwind e TipTap de verdade.

## Política de testes (frontend)

Leve. Cobrir o que quebra em silêncio: que o conteúdo digitado vira o `doc` correto enviado
à API, e que abrir uma nota existente carrega o `doc`. O resto valida usando.

## Convenção de idioma

UI via i18n (pt/en). Código em inglês.

## Funcionalidade

1. **Editor TipTap** com as marcas básicas: negrito, itálico, títulos, listas, citação,
   link, cor — as mesmas do protótipo. Componente em `@cerebro/ui` (reusável por web depois).
2. **Cabeçalho por tipo/ritual:** devocional / reflexão / fichamento / nota, com a identidade
   visual (cor por ritual). O `type`/`scope` muda só o cabeçalho/contexto, não a estrutura.
3. **Salvar:** envia `doc` (JSON) + metadados via API. Indicador de "salvando/salvo".
   - Para devocional/reflexão, usar o fluxo de diário (cria-ou-obtém do dia) — bate no
     endpoint correspondente do backend (Bloco B).
4. **Carregar:** abrir a nota do dia (se existir) para continuar editando.
5. **Mobile-first:** toolbar utilizável no toque, área de escrita confortável no celular.

## Fora de escopo

- NÃO painel de perguntas-guia ainda (Tarefa 23).
- NÃO anexar foto ainda (Tarefa 23).
- NÃO offline (Tarefa 24).

## Definição de pronto

- [ ] Editor TipTap funcional no mobile, com as marcas do protótipo, estilizado com Tailwind.
- [ ] Componente do editor em `@cerebro/ui`.
- [ ] Criar e reabrir uma nota (incl. devocional/reflexão do dia) salvando/lendo o `doc`.
- [ ] Indicador salvando/salvo.
- [ ] Teste mínimo: conteúdo ↔ `doc` enviado/recebido.
- [ ] Reporte ao dono: arquivos tocados + checklist marcado.
