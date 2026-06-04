# Tarefa 24 — Offline Nível 1 (captura/escrita offline + sync)

## Objetivo

Fazer **capturar e escrever funcionarem sem conexão**: o que o usuário cria offline entra
numa fila local e é sincronizado com o backend quando a rede volta. É o caso crítico do app
("tive uma ideia no busão sem sinal"). NÃO é o app inteiro offline (Nível 2) — só captura e
escrita.

## Camada(s)

Frontend (mobile/PWA): Service Worker + armazenamento local + lógica de sync. Sem mudança no
backend (ele só recebe as requisições normais quando o sync acontece).

## Pré-requisitos

- Telas de captura (21) e editor (20) prontas.
- PWA já configurada (Vite PWA plugin, desde a Tarefa 19).

## Escopo exato (o que é e o que NÃO é offline)

- **Funciona offline:** criar captura; criar/editar nota (devocional, reflexão, etc.).
- **NÃO precisa funcionar offline:** ler a biblioteca inteira, listas históricas, agenda
  completa. Se não houver rede, é aceitável mostrar o que estiver em cache + um aviso suave.
- **SEM resolução de conflito** (isso é Nível 2). Como é single-user e a janela offline é
  curta, assumir "last write wins" simples e seguir. Documentar essa premissa.

## Armazenamento da fila

- Usar **IndexedDB** para a fila de operações pendentes (não localStorage — limite e
  sincronicidade ruins para isso). Pode usar um wrapper leve (ex.: `idb`) — escolher um e
  manter.
- Cada item da fila: um "comando" serializável (ex.: `{ id, type: 'createCapture'|'createNote'|'editNote', payload, createdAt, status }`).

## Estratégia

1. **App shell offline:** o Service Worker (via Vite PWA / Workbox) faz cache do shell para
   o app abrir sem rede.
2. **Fila de operações:** quando o usuário captura/escreve, a operação é gravada na fila
   IndexedDB e a UI responde como se tivesse dado certo (optimistic UI), marcando o item
   como "pendente de sync".
3. **Tentativa de envio:** se online, processa a fila imediatamente; se offline, espera.
4. **Sync ao voltar:** ouvir o evento de reconexão (`online`) e/ou Background Sync API;
   processar a fila em ordem, enviando ao backend. Em sucesso, remover da fila; em falha
   recuperável, manter e re-tentar (backoff simples).
5. **Feedback:** indicador discreto de "salvo localmente / sincronizando / sincronizado"
   (sem alarme; calmo, no espírito do app).

## IDs e optimistic UI

- Gerar um id temporário no cliente para o item criado offline, para a UI referenciá-lo.
- Ao sincronizar, reconciliar com o id real do backend (substituir o temporário). Garantir
  que reabrir uma nota criada offline (já sincronizada) use o id real.
- Evitar duplicação: se o sync já enviou, não reenviar (idempotência via id do comando).

## Testes (aqui a política é menos leve — é onde quebra em silêncio)

1. Fila: enfileirar uma captura offline persiste em IndexedDB e sobrevive a reload.
2. Sync: ao "voltar online", a fila é processada e esvaziada; o item vira persistido.
3. Ordem: múltiplas operações offline sincronizam na ordem de criação.
4. Falha de rede no meio do sync → item permanece na fila e re-tenta (não perde dado, não
   duplica).
5. Reconciliação de id temporário → id real após sync.
6. (Manual/documentado) abrir o app sem rede mostra o shell e permite capturar/escrever.

## Arquivos a tocar (orientação)

- `packages/mobile/src/lib/offline/queue.ts` (fila IndexedDB + tipos de comando) (+ testes).
- `packages/mobile/src/lib/offline/sync.ts` (processamento/reconciliação) (+ testes).
- Integração nas ações de captura (Tarefa 21) e escrita (Tarefa 20) para passar pela fila.
- Config do Service Worker (Vite PWA) para cache do shell + (opcional) Background Sync.

## Fora de escopo

- NÃO Nível 2 (app inteiro offline, leitura de tudo, resolução de conflito).
- NÃO offline para anexos/upload de foto (depende do storage; fora do MVP 1 offline).
- NÃO backend novo.

## Definição de pronto

- [x] Capturar e escrever funcionam sem rede; entram na fila e a UI responde (optimistic).
- [x] Sync ao reconectar processa a fila em ordem, sem perder nem duplicar.
- [x] Reconciliação de id temporário → real.
- [x] App abre offline (shell em cache) — `vite build` gera `sw.js`/workbox com precache + `navigateFallback`. (Abertura offline real no navegador: validação manual recomendada.)
- [x] Testes da fila/sync verdes (cenários 1–5); cenário 6 (abrir offline) verificado via build, pendente confirmação manual no device.
- [x] Premissa "sem resolução de conflito / last-write-wins" documentada (em `sync.ts`).
- [x] **Com isso o MVP 1 está COMPLETO.** 🎉
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
