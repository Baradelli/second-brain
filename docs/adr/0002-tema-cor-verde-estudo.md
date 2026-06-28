# ADR 0002 — Tema de cor "Verde de Estudo" (fim do mono) + cor categórica por tipo de nota

- Status: aceito
- Data: 2026-06-28
- Fase: Desktop/Web — polimento visual

## Contexto

O app web nasceu com uma paleta deliberadamente monocromática ("Mono / Tinta"): papel
quase branco + tinta, e — o ponto central — `--cerebro-accent` era **igual** à cor de texto
(`#18181b` claro / `#f4f4f5` escuro). Não havia matiz em lugar nenhum, exceto verde/vermelho
discretos de status. Os quatro tipos de nota (devocional / reflexão / estudo / nota) eram
**quatro tons de cinza** indistinguíveis entre si.

O dono relatou que o app parecia "morto, preto e branco demais" e pediu uma cor que ajudasse
no contexto de **estudo e aprendizado**. Toda a cor vive centralizada em
`packages/ui/src/theme.css` (tokens `--cerebro-*`, importados por web e mobile), então a troca
é num arquivo só.

## Decisão

Adotar **"Verde de Estudo"**: um verde profundo e calmo como cor primária/acento (foco,
crescimento do conhecimento, retenção, descanso visual em leitura longa), claro e escuro:

- Acento: `#2f6b4f` (claro) / `#5aa87f` (escuro); superfícies e tinta passam a ser
  neutros **levemente esverdeados** (bg `#f5f6f2` / `#0e1310`).
- Os **tipos de nota viram categóricos** (matizes distintos, harmonizados em L/C parecidos):
  devocional violeta/ameixa, reflexão azul-petróleo, estudo verde (família primária), nota
  areia/ocre. Como já eram lidos via `var(--cerebro-<tipo>)` (Grafo, seções, fichamentos),
  ganham cor sem tocar nos componentes.
- `--cerebro-success` foi **afastado** do verde da marca (mais claro/vivo) para "feito" não se
  confundir com a identidade.
- O grão de papel (`body::before`) foi re-tingido de quente para um verde sutil.

A estratégia de cor é **"verde + categórico"** (não um accent quente separado): uma família de
cor lidera, e os tipos de nota diferenciam por matiz — vivo e coeso, sem virar arco-íris.

## Alternativas consideradas

- **Índigo de foco** (azul): leitura/foco, porém é o reflexo "óbvio" de app de estudo — menos
  distintivo.
- ** Tinta & âmbar** e **ameixa intelectual**: descartados como primária; o verde casou melhor
  com o serif (Fraunces) + textura de papel já existentes e com a leitura prolongada.
- **Restrito (só verde, tipos neutros)**: resolveria pouco o "preto e branco demais".

## Consequências

- (+) Cura o "morto/mono" sem reescrever telas: a troca de tokens propaga para web **e** mobile.
- (+) Tipos de nota viram escaneáveis por cor (Grafo e listas).
- (+) Identidade mais forte e temática (estudo), preservando serif + papel.
- (−) Contraste precisa ser vigiado: `--cerebro-muted` em neutro esverdeado tem que manter
  ≥4.5:1 no papel (validado nos valores escolhidos; reavaliar se a rampa mudar).
- A reversão é trivial (um arquivo). Mobile herda a mesma paleta — intencional.
