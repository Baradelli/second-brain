# Tarefa 14 — UseCase `buildTodayAgenda`

## Objetivo

Montar, no backend, o pacote da "agenda de hoje" que a tela vai consumir: o estado dos
momentos de diário (devocional/reflexão de hoje — feitos ou não) + as capturas a revisar
hoje. É o endpoint agregador que faz o papel de BFF (sem camada extra).

## Camada(s)

UseCase agregador. Compõe `findNoteOfTheDay` (Bloco B) e `listPendingCaptures` (Bloco C).

## Pré-requisitos

- Blocos A, B, C concluídos.
- `Settings` (timezone) acessível via `SettingsReader`.

## Convenção de idioma

Código/identificadores em **inglês**.

## Contrato

```ts
interface BuildTodayAgendaInput {
  userId: string;
  reference: Date; // "agora"
  // timezone é lido de Settings dentro do UseCase
}

interface TodayAgenda {
  date: string; // o dia local (ISO date) a que a agenda se refere
  journal: {
    devotional: { done: boolean; noteId?: string };
    reflection: { done: boolean; noteId?: string };
  };
  capturesToReview: Capture[]; // pendentes com reviewAt <= hoje (fuso do usuário)
}

class BuildTodayAgenda {
  constructor(
    private settings: SettingsReader,
    private findNoteOfTheDay: FindNoteOfTheDay,
    private listPendingCaptures: ListPendingCaptures,
  ) {}
  async execute(input: BuildTodayAgendaInput): Promise<TodayAgenda>;
}
```

Regras:

- Ler `timezone` de Settings do usuário; tudo calculado nesse fuso.
- `journal.devotional.done` = existe Note DEVOTIONAL de hoje (via `findNoteOfTheDay`);
  idem reflection. `done:false` quando não há (sem culpa — é só estado, ver princípio
  anti-culpa no plano).
- `capturesToReview` = `listPendingCaptures` (já respeita o "hoje" no fuso).
- `date` = dia local em ISO (YYYY-MM-DD) para a UI exibir.
- Nada de Goal/Resource/Event aqui (MVP 2 estende a agenda depois).

## Testes a escrever PRIMEIRO (unit, com fakes)

1. Sem nada feito → `devotional.done:false`, `reflection.done:false`, capturas conforme fila.
2. Com devocional de hoje criado → `devotional.done:true` + `noteId`.
3. Capturas pendentes de hoje aparecem; futuras não.
4. Tudo calculado no fuso do usuário (borda de dia UTC-3).
5. Usuário sem Settings → erro claro ou default sensato (fixar e documentar).

## Arquivos a tocar

- `packages/backend/src/usecases/build-today-agenda.ts` (+ teste).

## Fora de escopo

- NÃO incluir objetivos/eventos (MVP 2).
- NÃO criar a rota aqui (Tarefa 15).
- NÃO montar a tela (Bloco G).

## Definição de pronto

- [x] `buildTodayAgenda` agrega diário (done?) + capturas a revisar no fuso correto.
- [x] `done` é derivado (sem campo novo), fiel ao progresso calculado.
- [x] 5 testes passando (`pnpm test`).
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
