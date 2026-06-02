export interface UserSettings {
  timezone: string;
  reviewWeekday: number; // 0=Sun, 1=Mon, ..., 6=Sat
}

export interface SettingsReader {
  getByUserId(userId: string): Promise<UserSettings | null>;
}
