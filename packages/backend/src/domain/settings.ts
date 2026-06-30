export type AiMode = 'cheap' | 'connected';

/**
 * Uma cor de marca-texto (grifo) na paleta global do usuário. O `id` é estável:
 * o Highlight aponta para ele, então renomear/recolorir não quebra grifos antigos.
 */
export interface HighlightColor {
  id: string;
  color: string; // hex, ex '#FACC15'
  name: string; // significado editável, ex 'Interessante / vale lembrar'
  order: number;
}

export interface Settings {
  userId: string;
  reviewWeekday: number; // 0=domingo..6=sábado
  recapWeekday: number;
  timezone: string; // IANA
  devotionalTime: string; // HH:mm
  reflectionTime: string; // HH:mm
  aiMode: AiMode; // modo do agente (Bloco P): cheap = copiar/colar; connected = SDK (Tarefa 73)
  highlightColors: HighlightColor[]; // paleta de grifos; [] = ainda não configurada (usa o seed)
}

/**
 * Paleta-semente das cores de grifo. Usada quando o usuário ainda não configurou a
 * dele (campo vazio). Os `id` são estáveis e determinísticos de propósito: um grifo
 * criado contra o seed continua válido depois que a paleta é persistida pela 1ª edição.
 * Os hex espelham as cores já usadas no editor (RichEditor.tsx).
 */
export const DEFAULT_HIGHLIGHT_COLORS: readonly HighlightColor[] = [
  { id: 'hl-yellow', color: '#FACC15', name: 'Interessante / vale lembrar', order: 0 },
  { id: 'hl-pink', color: '#EC4899', name: 'Muito importante', order: 1 },
  { id: 'hl-blue', color: '#3B82F6', name: 'Pesquisar a fonte depois', order: 2 },
  { id: 'hl-green', color: '#22C55E', name: 'Novo tópico do livro', order: 3 },
  { id: 'hl-orange', color: '#F97316', name: 'Pôr em prática na vida', order: 4 },
];

/**
 * A paleta "efetiva": a que o usuário configurou, ou o seed quando ainda não mexeu.
 * Toda leitura/validação de cor passa por aqui para web, mobile e backend concordarem.
 */
export function effectiveHighlightColors(
  colors: HighlightColor[],
): HighlightColor[] {
  return colors.length > 0
    ? [...colors].sort((a, b) => a.order - b.order)
    : DEFAULT_HIGHLIGHT_COLORS.map((c) => ({ ...c }));
}

export const DEFAULT_SETTINGS: Omit<Settings, 'userId'> = {
  reviewWeekday: 0,
  recapWeekday: 0,
  timezone: 'America/Sao_Paulo',
  devotionalTime: '07:00',
  reflectionTime: '21:00',
  aiMode: 'cheap',
  highlightColors: [],
};
