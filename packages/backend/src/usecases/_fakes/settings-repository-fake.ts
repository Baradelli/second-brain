import { DEFAULT_SETTINGS, type Settings } from '../../domain/settings.js';
import type {
  SettingsPatch,
  SettingsRepository,
} from '../ports/settings-repository.js';

export class SettingsRepositoryFake implements SettingsRepository {
  private store = new Map<string, Settings>();

  async getByUserId(userId: string): Promise<Settings | null> {
    const found = this.store.get(userId);
    return found ? { ...found } : null;
  }

  async upsert(userId: string, patch: SettingsPatch): Promise<Settings> {
    const current =
      this.store.get(userId) ?? { userId, ...DEFAULT_SETTINGS };
    const updated: Settings = { ...current, ...patch, userId };
    this.store.set(userId, updated);
    return { ...updated };
  }
}
