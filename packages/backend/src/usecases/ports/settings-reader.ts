export interface UserSettings {
  timezone: string;
  reviewWeekday: number; // 0=Sun, 1=Mon, ..., 6=Sat
  recapWeekday?: number; // 0=Sun..6=Sat — início da semana do usuário (Tarefa 75)
}

export interface SettingsReader {
  getByUserId(userId: string): Promise<UserSettings | null>;
}
