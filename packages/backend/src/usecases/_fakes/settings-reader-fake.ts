import type { UserSettings, SettingsReader } from '../ports/settings-reader.js';

export class SettingsReaderFake implements SettingsReader {
  private store = new Map<string, UserSettings>();

  set(userId: string, settings: UserSettings) {
    this.store.set(userId, settings);
  }

  async getByUserId(userId: string): Promise<UserSettings | null> {
    return this.store.get(userId) ?? null;
  }
}
