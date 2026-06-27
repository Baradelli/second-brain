export type AiMode = 'cheap' | 'connected';

export interface Settings {
  userId: string;
  reviewWeekday: number; // 0=domingo..6=sábado
  recapWeekday: number;
  timezone: string; // IANA
  devotionalTime: string; // HH:mm
  reflectionTime: string; // HH:mm
  aiMode: AiMode; // modo do agente (Bloco P): cheap = copiar/colar; connected = SDK (Tarefa 73)
}

export const DEFAULT_SETTINGS: Omit<Settings, 'userId'> = {
  reviewWeekday: 0,
  recapWeekday: 0,
  timezone: 'America/Sao_Paulo',
  devotionalTime: '07:00',
  reflectionTime: '21:00',
  aiMode: 'cheap',
};
