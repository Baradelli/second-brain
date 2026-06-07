import type { Settings } from '../../domain/settings.js';

export type SettingsPatch = Partial<Omit<Settings, 'userId'>>;

export interface SettingsRepository {
  getByUserId(userId: string): Promise<Settings | null>;
  upsert(userId: string, patch: SettingsPatch): Promise<Settings>;
}
