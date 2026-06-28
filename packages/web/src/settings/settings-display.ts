import type { SettingsResponse, UpdateSettingsBody } from '@cerebro/shared';

/**
 * Lógica pura da tela de Config — fora do componente para poder testar sem DOM.
 * Cobre: as opções de dia da semana, a lista de timezones (com fallback) e o
 * mapeamento valores-do-formulário → payload do PATCH.
 *
 * O IDIOMA não mora aqui: ele é do i18n (não faz parte do schema de Settings), e
 * a tela troca via `i18n.changeLanguage`. Estas funções cuidam só do que o
 * `updateSettings` aceita.
 */

/** Os 7 índices de dia da semana (0 = domingo), na ordem natural. */
export const WEEKDAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

const FALLBACK_TIMEZONES = [
  'America/Sao_Paulo',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Lisbon',
  'Europe/London',
];

/**
 * Nome localizado de um dia da semana (0 = domingo). 2024-06-02 é um domingo, então
 * `2024-06-(2 + idx)` percorre a semana. Mantido puro — recebe o locale, não lê i18n.
 */
export function weekdayName(idx: number, locale: string): string {
  return new Date(2024, 5, 2 + idx).toLocaleDateString(locale, {
    weekday: 'long',
  });
}

/**
 * Lista de timezones para o select. Usa `Intl.supportedValuesOf('timeZone')`
 * quando disponível; senão cai num punhado de fusos comuns. Garante que o valor
 * atual (`current`) sempre aparece na lista, mesmo se o Intl não o listar.
 */
export function timezoneOptions(current: string): string[] {
  let zones: string[];
  try {
    const fn = (
      Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf;
    zones = fn ? fn('timeZone') : FALLBACK_TIMEZONES;
  } catch {
    zones = FALLBACK_TIMEZONES;
  }
  return zones.includes(current) ? zones : [current, ...zones];
}

/**
 * Campos editáveis do formulário de Config — exatamente os do schema de Settings
 * (o idioma é tratado à parte, via i18n). Tipo derivado de `SettingsResponse`
 * para nunca sair de sincronia com o shared.
 */
export type SettingsFormValues = Pick<
  SettingsResponse,
  | 'timezone'
  | 'reviewWeekday'
  | 'recapWeekday'
  | 'devotionalTime'
  | 'reflectionTime'
  | 'aiMode'
>;

/** Resposta do servidor → valores iniciais do formulário. */
export function settingsToFormValues(s: SettingsResponse): SettingsFormValues {
  return {
    timezone: s.timezone,
    reviewWeekday: s.reviewWeekday,
    recapWeekday: s.recapWeekday,
    devotionalTime: s.devotionalTime,
    reflectionTime: s.reflectionTime,
    aiMode: s.aiMode,
  };
}

/**
 * Valores do formulário → corpo do PATCH. Hoje é 1:1, mas centralizar aqui deixa
 * o mapeamento testável e protege contra o formulário e o payload divergirem.
 */
export function formValuesToPayload(
  values: SettingsFormValues,
): UpdateSettingsBody {
  return {
    timezone: values.timezone,
    reviewWeekday: values.reviewWeekday,
    recapWeekday: values.recapWeekday,
    devotionalTime: values.devotionalTime,
    reflectionTime: values.reflectionTime,
    aiMode: values.aiMode,
  };
}
