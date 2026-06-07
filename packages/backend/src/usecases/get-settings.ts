import { DEFAULT_SETTINGS, type Settings } from '../domain/settings.js';
import type { SettingsRepository } from './ports/settings-repository.js';

export interface GetSettingsInput {
  userId: string;
}

/** Devolve as configurações do usuário; se ainda não existem, os defaults (sem persistir). */
export class GetSettings {
  constructor(private repo: SettingsRepository) {}

  async execute(input: GetSettingsInput): Promise<Settings> {
    const existing = await this.repo.getByUserId(input.userId);
    return existing ?? { userId: input.userId, ...DEFAULT_SETTINGS };
  }
}
