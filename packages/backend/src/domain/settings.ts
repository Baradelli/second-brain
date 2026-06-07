export interface Settings {
  userId: string;
  reviewWeekday: number; // 0=domingo..6=sábado
  recapWeekday: number;
  timezone: string; // IANA
  devotionalTime: string; // HH:mm
  reflectionTime: string; // HH:mm
}

export const DEFAULT_SETTINGS: Omit<Settings, 'userId'> = {
  reviewWeekday: 0,
  recapWeekday: 0,
  timezone: 'America/Sao_Paulo',
  devotionalTime: '07:00',
  reflectionTime: '21:00',
};
