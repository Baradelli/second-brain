# Tarefa 19 — Base do frontend (mobile-first)

## Objetivo

Deixar o app `mobile/` de pé: Vite + React + PWA, Tailwind, i18n (pt/en), roteamento, e um
cliente HTTP que consome a API do backend usando os schemas Zod de `@cerebro/shared`. É a
fundação sobre a qual as telas (20–23) serão construídas. O `web/` fica como shell simples.

## Camada(s)

Frontend (mobile). Sem lógica de negócio nova — consome o backend pronto (Blocos A–F).

## Política de testes (frontend)

Mais leve, conforme o `CLAUDE.md`: testar só fluxos que quebram em silêncio. Aqui, no setup,
basta um smoke test (app monta, i18n troca idioma). Sem perseguir cobertura de UI.

## Convenção de idioma

Código em inglês; textos de UI via `t('key')` com chaves semânticas em inglês
(`agenda.todayTitle`), `pt` default e `en` como segundo locale.

## Tarefas concretas

1. **Tailwind** no `mobile/` (e config base reaproveitável a partir de `ui/` quando o `web/`
   entrar). Mobile-first: estilos pensados para a tela pequena primeiro.
2. **i18n (react-i18next):** init com `pt` default e `en` segundo locale; arquivos
   `locales/pt.json` e `locales/en.json` (o `en` pode começar incompleto). Um seletor de
   idioma simples já ajuda a validar.
3. **Roteamento:** definir as rotas das telas que virão (agenda/home, editor, captura,
   revisão). Usar uma lib de routing client-side (ex.: react-router) — escolher uma e manter.
4. **Cliente HTTP:** um wrapper de `fetch` que:
   - aponta para a base URL do backend (via env `VITE_API_URL`);
   - valida a RESPOSTA com os schemas de `@cerebro/shared` quando fizer sentido (defesa na
     borda do front também);
   - usa o usuário fixo "owner" enquanto não há auth (mandar `userId` onde a API pede).
5. **Estrutura de pastas** do `mobile/src` (ex.: `pages/`, `components/`, `lib/api/`,
   `lib/i18n/`) — clara e enxuta.

## O que vai para `ui/`

- Componentes genuinamente reusáveis (botões, campos, layout shell) entram em `@cerebro/ui`
  já agora, para o `web/` reaproveitar depois. O que é específico de layout mobile fica no
  `mobile/`.

## Arquivos a tocar (orientação)

- `packages/mobile/` (Tailwind config, main, router, i18n init, locales, lib/api).
- `packages/ui/src/` (primeiros componentes compartilhados + Tailwind preset, se aplicável).
- `packages/mobile/.env.example` (`VITE_API_URL=http://localhost:3333`).

## Fora de escopo

- NÃO construir as telas de conteúdo ainda (20–23).
- NÃO offline/service worker aqui (Bloco H — Tarefa 24).
- NÃO caprichar no `web/` agora (shell simples; mobile primeiro).

## Definição de pronto

- [x] `pnpm dev:mobile` sobe o app com Tailwind aplicado.
- [x] i18n funcionando; trocar pt↔en muda os textos.
- [x] Roteamento com as rotas das próximas telas (mesmo que vazias/placeholder).
- [x] Cliente HTTP consumindo ao menos um endpoint real do backend (ex.: `GET /agenda`).
- [x] Smoke test mínimo verde.
- [x] Reporte ao dono: arquivos tocados + checklist marcado + a lib de routing escolhida.
