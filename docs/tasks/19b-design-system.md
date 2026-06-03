# Tarefa 19b — Sistema de design + tema dark/light + componentes-base

<!-- /plugin install frontend-design@claude-plugins-official -->

## Objetivo

Estabelecer a **identidade visual** do app (tokens, paleta, tipografia, espaçamento, raios,
motion), o **tema claro/escuro** alternável e persistente, e os **componentes-base**
reutilizáveis. NÃO é montar as telas — é dar a "linguagem visual" para que as telas (20–23)
nasçam bonitas e consistentes.

> Contexto: a Tarefa 19 montou a fundação (Vite, Tailwind, i18n, rotas, cliente HTTP), mas
> sem design — por isso o app está "cru". Esta tarefa veste essa fundação. O protótipo
> aprovado pelo dono é a referência de clima (minimalista clean, tipo Things/Linear, com um
> toque editorial em momentos contemplativos). Seguir a LINHA do protótipo, sem precisar
> reproduzir as telas (que ainda não existem nesta fase).

## Camada(s)

Frontend. Tokens/tema/componentes em `@cerebro/ui` (compartilháveis com `web/` depois);
aplicação e teste no `mobile/`.

## Política de testes (frontend)

Leve. O que vale travar: o ThemeToggle alterna e **persiste** (localStorage) e aplica a
classe no `<html>`. O visual em si valida-se usando.

## Convenção de idioma

Código em inglês; qualquer texto de UI via i18n.

## Design tokens (Tailwind)

Configurar no preset Tailwind (em `ui/`, reutilizado por mobile e web). Definir como CSS
variables que trocam com o tema, e mapear no `theme.extend` do Tailwind.

**Paleta**

- Acento (único): `#6D5DFC` (roxo). Usado com parcimônia — CTAs, ativo, progresso.
- Light: `background #FAFAF8` (warm white), `foreground` near-black (~#1A1A22),
  `card #FFFFFF`, `border` hairline (~rgba(0,0,0,0.07)), `muted` cinza suave.
- Dark: `background #0F1115` (deep charcoal), `card #181B21` (superfície elevada),
  `foreground` ~#F5F5F2, `border` hairline (~rgba(255,255,255,0.07)), `muted` ~#8A8A95.

**Tipografia**

- Corpo/UI: Inter (com fallback de system stack).
- **Toque editorial:** subtítulos contemplativos (ex.: a frase calma sob o "Boa tarde") em
  **serifa itálica**. Usar pontualmente — é o respiro, não o app inteiro.
- Escala: 12 / 14 / 16 / 18 / 22 / 28 / 34. Tracking apertado nos títulos grandes
  (-0.02em), line-height generoso no corpo (~1.55).

**Espaçamento**: 4, 8, 12, 16, 24, 32, 48.

**Raios**: 16px padrão; 18–24px em cards; full (pill) em chips/botões redondos.

**Motion**: 150–250ms ease-out; leve `scale(0.98)` no press; fade+slide para sheets.

## Tema claro/escuro

- `ThemeToggle`: alterna `.dark` (ou `data-theme`) no `<html>`, **persiste em localStorage**,
  respeita `prefers-color-scheme` na primeira visita.
- Ícone sol/lua no canto superior (como no protótipo).
- **Importante:** persistência aqui é via localStorage no app real (NÃO é artifact) — ok usar.

## Componentes-base (em `@cerebro/ui`)

Construir os blocos que as telas 20–23 vão consumir (sem montar as telas):

- `ThemeProvider` + `ThemeToggle`.
- `Card` (superfície elevada, raio, hairline).
- `SectionHeader` (rótulo em caps espaçado, ex.: "HOJE", "INBOX").
- `BottomTabBar` com o **botão de captura central elevado** (FAB-in-tabbar, círculo roxo):
  Home · Biblioteca · **Captura** · Escrever · Assistente. (As telas existem depois; aqui é
  o componente de navegação.)
- `LabelChip` / `Chip` (pill).
- `ProgressRing` e/ou barra de progresso fina (para metas, usado no MVP 2 — criar o
  componente já ajuda).
- `BottomSheet` (folha que sobe — base para a captura rápida da Tarefa 21).
- `EmptyState` (ilustração/ícone + texto calmo — alinhado ao princípio anti-culpa).
- Estados base de `Button`, `Input`, `Textarea` no estilo do design.

## Mobile-frame (opcional, dev)

Como é mobile-first, em telas largas o app pode aparecer centralizado (largura máxima ~ md)
com um leve frame — só conveniência de desenvolvimento; não é requisito.

## Fora de escopo

- NÃO montar as telas de conteúdo (Home/agenda, editor, captura, inbox) — Tarefas 20–23.
- NÃO offline (Tarefa 24).
- NÃO caprichar no `web/` ainda (mobile primeiro).
- NÃO criar telas extras do protótipo que não estão no MVP 1 (ex.: Assistente é MVP 5; o
  ícone pode existir na tab bar, mas a tela não).

## Definição de pronto

- [ ] Tokens (paleta, tipografia, espaçamento, raios, motion) no preset Tailwind em `ui/`.
- [ ] Tema claro/escuro alternável, persistente (localStorage) e respeitando o sistema.
- [ ] Acento roxo `#6D5DFC`; warm white / deep charcoal conforme o tema.
- [ ] Serifa itálica disponível para os subtítulos contemplativos.
- [ ] Componentes-base criados em `@cerebro/ui` e renderizando nos dois temas.
- [ ] Uma tela de amostra (pode ser a Home placeholder da Tarefa 19) re-vestida para validar
      o sistema nos dois temas — sem ainda ser a tela final.
- [ ] Teste mínimo do ThemeToggle (alterna + persiste).
- [ ] Reporte ao dono: arquivos tocados + checklist marcado.
