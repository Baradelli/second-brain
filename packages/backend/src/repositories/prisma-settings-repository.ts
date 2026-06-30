import type { PrismaClient, Prisma } from '@prisma/client';

import type { HighlightColor, Settings } from '../domain/settings.js';
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
  highlightColors: Prisma.JsonValue;
}): Settings {
  return {
    userId: s.userId,
    reviewWeekday: s.reviewWeekday,
    recapWeekday: s.recapWeekday,
    timezone: s.timezone,
    devotionalTime: s.devotionalTime,
    reflectionTime: s.reflectionTime,
    aiMode: s.aiMode as Settings['aiMode'],
    highlightColors: Array.isArray(s.highlightColors)
      ? (s.highlightColors as unknown as HighlightColor[])
      : [],
  };
}

/** Mapeia o patch de domínio para o `data` do Prisma (highlightColors é Json). */
function toData(
  patch: SettingsPatch,
): Prisma.SettingsUncheckedUpdateInput & Prisma.SettingsUncheckedCreateInput {
  const { highlightColors, ...rest } = patch;
  return {
    ...rest,
    ...(highlightColors !== undefined
      ? { highlightColors: highlightColors as unknown as Prisma.InputJsonValue }
      : {}),
  } as Prisma.SettingsUncheckedUpdateInput &
    Prisma.SettingsUncheckedCreateInput;
}

export class PrismaSettingsRepository implements SettingsRepository {
  constructor(private prisma: PrismaClient) {}

  async getByUserId(userId: string): Promise<Settings | null> {
    const s = await this.prisma.settings.findUnique({ where: { userId } });
    return s ? toDomain(s) : null;
  }

  async upsert(userId: string, patch: SettingsPatch): Promise<Settings> {
    const data = toData(patch);
    const s = await this.prisma.settings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    return toDomain(s);
  }
}
