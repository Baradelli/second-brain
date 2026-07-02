import type { CalendarDayResponse } from '@cerebro/shared';
import { describe, expect, it } from 'vitest';

import {
  buildMonthGrid,
  dayHasGoals,
  dayHasJournal,
  dayNumber,
  leadingBlanks,
} from '../calendar-grid.js';

// currentMonthISO/todayISO/shiftMonth agora moram no shared (local-day.ts) e
// são testados lá — aqui fica só a matemática de grade (Tarefa 75).

function day(date: string, over: Partial<CalendarDayResponse> = {}): CalendarDayResponse {
  return {
    date,
    goalsPlanned: 0,
    goalsDone: 0,
    journal: { devotional: false, reflection: false },
    ...over,
  };
}

describe('leadingBlanks', () => {
  // Domingo=0..Sábado=6. 2026-06-01 é uma segunda → 1 blank antes do dia 1.
  it('conta os blanks até o dia da semana do dia 1', () => {
    expect(leadingBlanks('2026-06')).toBe(1); // segunda
    expect(leadingBlanks('2026-02')).toBe(0); // 2026-02-01 é domingo
    expect(leadingBlanks('2026-03')).toBe(0); // 2026-03-01 é domingo
  });
});

describe('dayNumber', () => {
  it('extrai o número do dia sem new Date', () => {
    expect(dayNumber('2026-06-04')).toBe(4);
    expect(dayNumber('2026-12-31')).toBe(31);
  });
});

describe('buildMonthGrid', () => {
  it('prefixa blanks e mantém a ordem dos dias do backend', () => {
    const days = [day('2026-06-01'), day('2026-06-02'), day('2026-06-03')];
    const grid = buildMonthGrid('2026-06', days);
    // 1 blank (segunda) + 3 dias
    expect(grid).toHaveLength(4);
    expect(grid[0]?.day).toBeNull();
    expect(grid[1]?.day?.date).toBe('2026-06-01');
    expect(grid[3]?.day?.date).toBe('2026-06-03');
  });

  it('não inventa dias quando o backend devolve lista vazia', () => {
    const grid = buildMonthGrid('2026-02', []); // fevereiro começa no domingo → 0 blanks
    expect(grid).toHaveLength(0);
  });

  it('dá chaves estáveis e únicas', () => {
    const grid = buildMonthGrid('2026-06', [day('2026-06-01')]);
    const keys = grid.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('dayHasGoals / dayHasJournal', () => {
  it('detecta metas previstas ou cumpridas', () => {
    expect(dayHasGoals(day('2026-06-01'))).toBe(false);
    expect(dayHasGoals(day('2026-06-01', { goalsPlanned: 2 }))).toBe(true);
    expect(dayHasGoals(day('2026-06-01', { goalsDone: 1 }))).toBe(true);
  });
  it('detecta diário', () => {
    expect(dayHasJournal(day('2026-06-01'))).toBe(false);
    expect(
      dayHasJournal(day('2026-06-01', { journal: { devotional: true, reflection: false } })),
    ).toBe(true);
  });
});
