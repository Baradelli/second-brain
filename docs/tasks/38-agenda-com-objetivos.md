# Tarefa 38 — Estender `buildTodayAgenda` com os objetivos do dia

> Fecha o **Bloco L**. A agenda de hoje (visão da manhã: diário + capturas a revisar) passa a
> mostrar também **os objetivos do dia**, **sem quebrar o contrato atual** (só acrescenta campo).
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.** Em conflito com esta spec, vale aquele
> arquivo.

## Objetivo

Acrescentar à `TodayAgenda` a lista de objetivos relevantes hoje, reaproveitando a seleção de
"objetivos do dia" da Tarefa 36 (não duplicar a regra). A agenda mostra o estado de cada um
(resolvido hoje ou não), enquanto o fechar-o-dia mostra só os pendentes.

## Como é hoje (referência, NÃO quebrar)

`BuildTodayAgenda.execute` retorna:

```ts
interface TodayAgenda {
  date: string;
  journal: { devotional: { done; noteId? }; reflection: { done; noteId? } };
  capturesToReview: Capture[];
}
```

A rota `GET /agenda` serializa isso (`todayAgendaResponseSchema`). **Tudo isso permanece igual.**

## O que muda (apenas acréscimo)

Adicionar o campo `goals` à `TodayAgenda`:

```ts
export interface AgendaGoal {
  goalId: string;
  title: string;
  kind: 'scheduled' | 'invitation';
  resolvedToday: boolean; // já tem done/skip hoje?
}

interface TodayAgenda {
  // ...campos atuais inalterados...
  goals: AgendaGoal[];
}
```

`buildTodayAgenda` ganha as deps `GoalRepository` + `EventRepository` (já injeta `SettingsReader`).
Adicionar à query `Promise.all` a seleção dos objetivos do dia.

## Reuso da regra (não espalhar)

A seleção "objetivos do dia" (weekdays de hoje + convites de período aberto) é **a mesma** da
Tarefa 36. Extrair essa seleção para um ponto único e usá-la nos dois:

- Opção recomendada: um helper/serviço `selectTodaysGoals({ goals, events, tz, reference })`
  (puro, recebe os dados já lidos) em `src/domain/` ou um pequeno UseCase compartilhado, que
  retorna os itens com `kind`. `buildDayClosing` filtra para `resolvedToday === false`; a agenda
  inclui todos com a flag `resolvedToday`.
- Se a Tarefa 36 já tiver deixado essa lógica isolável, reusar direto. **Não** copiar a regra.

## Decisões que assumi (revisar antes de executar)

- **Agenda mostra agendados + convites de hoje, com `resolvedToday`** (inclusive os já feitos,
  para dar senso de progresso na manhã/dia). O fechar-o-dia (36) mostra só os pendentes. Se
  preferir a agenda também só com pendentes, removo a flag e filtro igual ao 36.
- **Só HABIT** (mesma fronteira da Tarefa 36).
- **Campo novo `goals` é obrigatório no response** (array, possivelmente vazio) — acréscimo
  retrocompatível: nenhum campo atual muda. Clientes antigos ignoram o campo novo.

## Testes

- **UseCase** `build-today-agenda.test.ts` (estender o existente): a agenda traz `goals` com
  os agendados/convites de hoje e `resolvedToday` correto; **os campos atuais seguem iguais**
  (não regredir os testes que já existem).
- **Rota** `GET /agenda`: response agora inclui `goals` (schema atualizado); 1 caminho com um
  HABIT agendado hoje aparecendo.

## Arquivos a tocar

- `src/usecases/build-today-agenda.ts` (+deps Goal/Event; campo `goals`).
- `src/domain/` (helper `selectTodaysGoals`, se extraído da 36) — ou reusar o da 36.
- `packages/shared/` — `todayAgendaResponseSchema` ganha `goals` (no arquivo onde estiver; hoje
  o schema vive em `agenda-routes.ts` — considerar mover p/ `shared/` ou estender inline).
- `src/routes/agenda-routes.ts` — montar `goals` no response.
- Testes acima.
- **Não** tocar: telas, fechar-o-dia (já feito na 36), promote (37).

## Fora de escopo

- Telas (Bloco M). Progresso detalhado por objetivo na agenda (a agenda lista; o detalhe é
  `GET /goals/:id/progress`).

## Definição de pronto

- [ ] `TodayAgenda` ganha `goals` (agendados+convites de hoje, com `resolvedToday`), **sem
      alterar** `date`/`journal`/`capturesToReview`.
- [ ] A seleção de objetivos do dia é **compartilhada** com a Tarefa 36 (regra num lugar só).
- [ ] Testes do UseCase atualizados (campos antigos intactos + novo `goals`); rota `/agenda`
      com `goals` no schema; verdes.
- [ ] `unit` e `integration` verdes.
- [ ] Marcar `BACKLOG.md` + esta "Definição de pronto", reportar e **parar**.
