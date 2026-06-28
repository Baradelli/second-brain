# ADR 0003 — Tour de onboarding com `driver.js` (dependência nova no web)

- Status: aceito
- Data: 2026-06-28
- Fase: Desktop/Web — guia "como usar"

## Contexto

O app não tinha **nenhum** onboarding/guia. O dono pediu uma "introdução com highlights
demonstrando como usar e para quê", e escolheu o formato de **tour spotlight sobre a UI real**
(balões apontando elementos de verdade — sidebar, botão de captura, etc.).

A parte difícil de um spotlight é mecânica: posicionar o recorte e o balão sobre o
`boundingRect` do alvo, rolar até ele, reposicionar no resize, prender foco — exatamente o que
costuma deixar esse tipo de feature frágil. O `CLAUDE.md` exige decisão explícita do dono para
mexer no stack; adicionar uma lib é uma dessas decisões.

## Decisão

Adicionar **`driver.js`** (MIT, ~5kb, zero dependências) ao pacote `@cerebro/web` e construir o
tour em `packages/web/src/onboarding/`:

- `tour-steps.ts` define os passos; cada um aponta para um **`[data-tour="…"]`** colocado em
  elementos reais (âncoras estáveis, não seletores de classe frágeis). Passos sem `element`
  viram cartão central (boas-vindas / encerramento).
- `AppTour.tsx` expõe um `TourProvider` + `useTour()` (`startTour`). Filtra em runtime os passos
  cujo alvo **não está montado** (`querySelector`), então o tour nunca trava num elemento
  ausente. Auto-inicia no primeiro acesso (flag `web.tour.seen` via `usePersistentState`) e é
  reabrível pelo ícone `?` no header e por uma ação na paleta de comandos.
- `tour.css` (importado **depois** de `driver.js/dist/driver.css`) re-tematiza o popover/overlay
  com os tokens `--cerebro-*` (verde), serifa no título, e respeita
  `@media (prefers-reduced-motion: reduce)` (além de `animate:false` quando reduzido).
- Textos 100% via i18n (`tour.*`, em pt/en).

## Alternativas consideradas

- **Tour custom (zero dependência):** controle visual total, mas reimplementar
  scroll/resize/foco/recorte é justamente a superfície de bug que queremos evitar. Não vale o
  custo aqui.
- **Walkthrough/página estática:** rejeitados pelo dono em favor do spotlight imersivo.
- **react-joyride:** mais pesado e mais "React-acoplado" que o necessário para este uso.

## Consequências

- (+) Mecânica robusta (scroll, resize, foco, recorte) por ~5kb, sem rede em runtime — compatível
  com PWA/CSP.
- (+) Âncoras `data-tour` + filtro de passos = tolerante a mudanças de UI.
- (−) Uma dependência nova no `package.json` do web e CSS default que precisou ser sobrescrito
  para casar com o tema (feito em `tour.css`).
- O tour só existe no web (desktop); o mobile não usa driver.js.
