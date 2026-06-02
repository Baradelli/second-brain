import type { PrismaClient } from '@prisma/client';

import type { SettingsReader,UserSettings } from '../usecases/ports/settings-reader.js';

export class PrismaSettingsReader implements SettingsReader {
  constructor(private prisma: PrismaClient) {}

  async getByUserId(userId: string): Promise<UserSettings | null> {
    const s = await this.prisma.settings.findUnique({ where: { userId } });
    if (!s) return null;
    return { timezone: s.timezone, reviewWeekday: s.reviewWeekday };
  }
}
