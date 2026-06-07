import type { Settings } from '../domain/settings.js';
import type {
  SettingsPatch,
  SettingsRepository,
} from './ports/settings-repository.js';

export interface UpdateSettingsInput {
  userId: string;
  patch: SettingsPatch;
}

/** Aplica o patch (já validado na borda) às configurações do usuário, criando se necessário. */
export class UpdateSettings {
  constructor(private repo: SettingsRepository) {}

  async execute(input: UpdateSettingsInput): Promise<Settings> {
    return this.repo.upsert(input.userId, input.patch);
  }
}
