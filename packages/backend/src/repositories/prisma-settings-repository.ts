import type { PrismaClient } from '@prisma/client';

import type { Settings } from '../domain/settings.js';
import type {
  SettingsPatch,
  SettingsRepository,
} from '../usecases/ports/settings-repository.js';

function toDomain(s: {
  userId: string;
  reviewWeekday: number;
  recapWeekday: number;
  timezone: string;
  devotionalTime: string;
  reflectionTime: string;
  aiMode: string;
}): Settings {
  return {
    userId: s.userId,
    reviewWeekday: s.reviewWeekday,
    recapWeekday: s.recapWeekday,
    timezone: s.timezone,
    devotionalTime: s.devotionalTime,
    reflectionTime: s.reflectionTime,
    aiMode: s.aiMode as Settings['aiMode'],
  };
}

export class PrismaSettingsRepository implements SettingsRepository {
  constructor(private prisma: PrismaClient) {}

  async getByUserId(userId: string): Promise<Settings | null> {
    const s = await this.prisma.settings.findUnique({ where: { userId } });
    return s ? toDomain(s) : null;
  }

  async upsert(userId: string, patch: SettingsPatch): Promise<Settings> {
    const s = await this.prisma.settings.upsert({
      where: { userId },
      update: patch,
      create: { userId, ...patch },
    });
    return toDomain(s);
  }
}
