import { randomUUID } from 'node:crypto';

import { createCaptureSchema } from '@cerebro/shared';

import type { Capture } from '../domain/capture.js';
import { nextWeekday } from '../domain/next-weekday.js';
import type { CaptureRepository } from './ports/capture-repository.js';
import type { SettingsReader } from './ports/settings-reader.js';

export class CreateCapture {
  constructor(
    private repo: CaptureRepository,
    private settings: SettingsReader,
  ) {}

  async execute(rawInput: unknown, now: Date = new Date()): Promise<Capture> {
    const input = createCaptureSchema.parse(rawInput);

    let reviewAt: Date | null = input.reviewAt ?? null;

    if (reviewAt === null) {
      const userSettings = await this.settings.getByUserId(input.userId);
      if (userSettings) {
        reviewAt = nextWeekday(
          now,
          userSettings.timezone,
          userSettings.reviewWeekday,
        );
      }
    }

    const capture: Capture = {
      id: randomUUID(),
      userId: input.userId,
      text: input.text,
      url: input.url,
      status: 'PENDING',
      reviewAt,
      processedAt: null,
      promotedToType: null,
      promotedToId: null,
      archivedAt: null,
      archiveReason: null,
      labelIds: input.labelIds,
      createdAt: now,
    };

    return this.repo.save(capture);
  }
}
