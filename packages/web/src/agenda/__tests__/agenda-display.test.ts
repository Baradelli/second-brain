import { describe, expect, it } from 'vitest';

import { formatAgendaDate, greetingKeyForHour } from '../agenda-display.js';

describe('greetingKeyForHour', () => {
  it('cumprimenta de manhã antes do meio-dia', () => {
    expect(greetingKeyForHour(0)).toBe('agenda.greeting.morning');
    expect(greetingKeyForHour(11)).toBe('agenda.greeting.morning');
  });

  it('cumprimenta à tarde entre 12 e 17h', () => {
    expect(greetingKeyForHour(12)).toBe('agenda.greeting.afternoon');
    expect(greetingKeyForHour(17)).toBe('agenda.greeting.afternoon');
  });

  it('cumprimenta à noite a partir das 18h', () => {
    expect(greetingKeyForHour(18)).toBe('agenda.greeting.evening');
    expect(greetingKeyForHour(23)).toBe('agenda.greeting.evening');
  });
});

describe('formatAgendaDate', () => {
  // O dia já vem resolvido do backend (timezone do Settings); o teste garante
  // que não "voltamos" um dia ao formatar — 2026-06-04 deve cair em 4 de junho.
  it('formata o dia local sem deslocar para o dia anterior', () => {
    const out = formatAgendaDate('2026-06-04', 'pt-BR');
    expect(out).toContain('4');
    expect(out.toLowerCase()).toContain('junho');
  });

  it('ignora a parte de hora se vier um ISO completo', () => {
    const out = formatAgendaDate('2026-06-04T23:30:00Z', 'pt-BR');
    expect(out).toContain('4');
    expect(out.toLowerCase()).toContain('junho');
  });
});
