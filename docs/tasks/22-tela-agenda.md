# Tarefa 22 — Tela "Agenda de hoje"

## Objetivo

A tela inicial do app: junta o diário do dia (devocional/reflexão — feitos ou não) com as
capturas a revisar hoje. Consome o agregador `GET /agenda?day=today` (Tarefa 14/15).

## Camada(s)

Frontend (mobile). Consome `GET /agenda?day=today` e linka para editor (Tarefa 20) e revisão
(Tarefa 21).

## Pré-requisitos

- Tarefas 19, 19b, 20, 21 (usar os componentes-base e o tema da 19b).
- `GET /agenda?day=today` pronto (Bloco E).

## Política de testes (frontend)

Leve. Cobrir: render do estado feito/não-feito do diário e a lista de capturas a revisar.

## Funcionalidade

1. **Diário do dia:** dois cartões — Devocional e Reflexão — mostrando se já foram feitos
   hoje (`journal.devotional.done` / `reflection.done`). Tocar abre o editor (Tarefa 20) no
   tipo/escopo certo (cria-ou-continua o do dia).
2. **Capturas a revisar:** as `capturesToReview` da agenda, com atalho para a revisão
   (Tarefa 21).
3. **Captura rápida** sempre à mão (reusa o componente da Tarefa 21).
4. **Data do dia** exibida (a `date` local que o backend devolve).

## Tom (princípio anti-culpa)

"Feito/não feito" é só estado, em tom de convite. Devocional não feito não é uma falha
estampada — é um cartão calmo "fazer devocional de hoje". Sem números de vergonha.

## Fora de escopo

- NÃO objetivos/eventos/biblioteca (MVP 2).
- NÃO métricas/streaks (MVP 3).
- NÃO offline (Tarefa 24).

## Definição de pronto

- [ ] Agenda mostra estado do diário (devocional/reflexão) e capturas a revisar.
- [ ] Cartões linkam para editor e revisão corretamente.
- [ ] Captura rápida acessível a partir da agenda.
- [ ] Tom calmo/convite (sem cobrança).
- [ ] Teste mínimo de render dos estados.
- [ ] Reporte ao dono: arquivos tocados + checklist marcado.
