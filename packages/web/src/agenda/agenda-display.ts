// Lógica pura de apresentação da Agenda (sem React, sem rede) — para testar com
// Vitest sem DOM. O "que dia é hoje" já vem resolvido do backend (no timezone do
// Settings); aqui só formatamos a string `YYYY-MM-DD` que ele devolve e derivamos
// a saudação a partir da hora local de quem está olhando a tela.

/** Chave i18n de saudação conforme a hora local (0–23). */
export function greetingKeyForHour(hour: number): string {
  if (hour < 12) return 'agenda.greeting.morning';
  if (hour < 18) return 'agenda.greeting.afternoon';
  return 'agenda.greeting.evening';
}

/**
 * Formata o dia local que o backend manda (`YYYY-MM-DD`, já no timezone do
 * Settings) para exibição. Montamos a data com componentes locais para não
 * "voltar" um dia: `new Date('2026-06-04')` seria meia-noite UTC e, num fuso
 * negativo, exibiria o dia anterior. Não é lógica de calendário/fuso — o dia já
 * foi resolvido no servidor; isto é só formatação. (Mesma estratégia do mobile.)
 */
export function formatAgendaDate(dateStr: string, locale: string): string {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
