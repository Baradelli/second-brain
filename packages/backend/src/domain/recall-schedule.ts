import { DateTime } from 'luxon';

import { dayRange } from './day-range.js';

// Escada fixa de revisões: 2 dias → 1 semana → 1 mês (Prática 3).
export const LADDER_DAYS = [2, 7, 30] as const;

export interface RecallScheduleInput {
  createdAt: Date; // do StudyItem (= dia do fichamento, "mesmo dia" da escada)
  recalls: { occurredAt: Date }[]; // todas as recalls do item (qualquer ordem)
  timezone: string; // do Settings
  reference: Date; // "agora" / o instante de referência
}

export interface RecallSchedule {
  index: number; // nº de recalls já feitas
  consolidated: boolean; // index >= LADDER_DAYS.length
  nextRecallAt: Date | null; // null se consolidado
  dueToday: boolean; // devida hoje (inclui atrasadas), por dia local
  overdue: boolean; // devida por estar atrasada (dia local estritamente anterior)
}

// Início do dia local (em UTC) de um instante — base para comparar por dia de calendário.
function localDayStart(instant: Date, timezone: string): number {
  return dayRange(instant, timezone, 'DAY').from.getTime();
}

export function computeRecallSchedule(
  input: RecallScheduleInput,
): RecallSchedule {
  const index = input.recalls.length;

  if (index >= LADDER_DAYS.length) {
    return {
      index,
      consolidated: true,
      nextRecallAt: null,
      dueToday: false,
      overdue: false,
    };
  }

  const base =
    index === 0
      ? input.createdAt
      : input.recalls.reduce(
          (max, r) => (r.occurredAt > max ? r.occurredAt : max),
          input.recalls[0].occurredAt,
        );

  const nextRecallAt = DateTime.fromJSDate(base, { zone: input.timezone })
    .plus({ days: LADDER_DAYS[index] })
    .toUTC()
    .toJSDate();

  const nextDay = localDayStart(nextRecallAt, input.timezone);
  const refDay = localDayStart(input.reference, input.timezone);

  return {
    index,
    consolidated: false,
    nextRecallAt,
    dueToday: nextDay <= refDay,
    overdue: nextDay < refDay,
  };
}
