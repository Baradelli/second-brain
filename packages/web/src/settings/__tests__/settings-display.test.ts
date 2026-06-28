import type { SettingsResponse } from '@cerebro/shared';
import { describe, expect, it } from 'vitest';

import {
  formValuesToPayload,
  settingsToFormValues,
  timezoneOptions,
  weekdayName,
  WEEKDAYS,
} from '../settings-display.js';

const settings: SettingsResponse = {
  timezone: 'America/Sao_Paulo',
  reviewWeekday: 0,
  recapWeekday: 6,
  devotionalTime: '07:00',
  reflectionTime: '21:30',
  aiMode: 'cheap',
};

describe('WEEKDAYS', () => {
  it('são os sete índices de domingo (0) a sábado (6)', () => {
    expect(WEEKDAYS).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('weekdayName', () => {
  it('mapeia 0 para domingo em pt-BR', () => {
    expect(weekdayName(0, 'pt-BR').toLowerCase()).toContain('domingo');
  });

  it('mapeia 1 para segunda-feira em pt-BR', () => {
    expect(weekdayName(1, 'pt-BR').toLowerCase()).toContain('segunda');
  });

  it('respeita o locale (en para Sunday)', () => {
    expect(weekdayName(0, 'en-US')).toBe('Sunday');
  });
});

describe('timezoneOptions', () => {
  it('inclui o timezone atual', () => {
    expect(timezoneOptions('America/Sao_Paulo')).toContain('America/Sao_Paulo');
  });

  it('garante que um timezone desconhecido apareça (no topo da lista)', () => {
    const opts = timezoneOptions('Mars/Olympus_Mons');
    expect(opts[0]).toBe('Mars/Olympus_Mons');
    expect(opts).toContain('Mars/Olympus_Mons');
  });

  it('não duplica um timezone já presente na lista do Intl', () => {
    const opts = timezoneOptions('UTC');
    expect(opts.filter((z) => z === 'UTC')).toHaveLength(1);
  });
});

describe('settingsToFormValues', () => {
  it('copia exatamente os campos editáveis do Settings', () => {
    expect(settingsToFormValues(settings)).toEqual({
      timezone: 'America/Sao_Paulo',
      reviewWeekday: 0,
      recapWeekday: 6,
      devotionalTime: '07:00',
      reflectionTime: '21:30',
      aiMode: 'cheap',
    });
  });
});

describe('formValuesToPayload', () => {
  it('mapeia valores do formulário para o corpo do PATCH', () => {
    const values = settingsToFormValues(settings);
    expect(formValuesToPayload({ ...values, aiMode: 'connected' })).toEqual({
      timezone: 'America/Sao_Paulo',
      reviewWeekday: 0,
      recapWeekday: 6,
      devotionalTime: '07:00',
      reflectionTime: '21:30',
      aiMode: 'connected',
    });
  });
});
