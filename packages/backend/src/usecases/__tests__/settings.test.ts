import { beforeEach, describe, expect, it } from 'vitest';

import { SettingsRepositoryFake } from '../_fakes/settings-repository-fake.js';
import { GetSettings } from '../get-settings.js';
import { UpdateSettings } from '../update-settings.js';

const USER = 'user-1';

describe('GetSettings', () => {
  let repo: SettingsRepositoryFake;

  beforeEach(() => {
    repo = new SettingsRepositoryFake();
  });

  it('returns defaults when the user has no settings yet', async () => {
    const s = await new GetSettings(repo).execute({ userId: USER });
    expect(s).toEqual({
      userId: USER,
      reviewWeekday: 0,
      recapWeekday: 0,
      timezone: 'America/Sao_Paulo',
      devotionalTime: '07:00',
      reflectionTime: '21:00',
      aiMode: 'cheap',
    });
  });

  it('returns the stored settings when they exist', async () => {
    await repo.upsert(USER, { timezone: 'Europe/Lisbon', reviewWeekday: 1 });
    const s = await new GetSettings(repo).execute({ userId: USER });
    expect(s.timezone).toBe('Europe/Lisbon');
    expect(s.reviewWeekday).toBe(1);
  });
});

describe('UpdateSettings', () => {
  let repo: SettingsRepositoryFake;

  beforeEach(() => {
    repo = new SettingsRepositoryFake();
  });

  it('creates settings from defaults applying the patch', async () => {
    const s = await new UpdateSettings(repo).execute({
      userId: USER,
      patch: { timezone: 'UTC', recapWeekday: 3 },
    });
    expect(s.timezone).toBe('UTC');
    expect(s.recapWeekday).toBe(3);
    expect(s.reviewWeekday).toBe(0); // default preservado
    expect(s.devotionalTime).toBe('07:00');
  });

  it('preserves fields not present in the patch', async () => {
    const update = new UpdateSettings(repo);
    await update.execute({ userId: USER, patch: { timezone: 'UTC' } });
    const s = await update.execute({
      userId: USER,
      patch: { reviewWeekday: 5 },
    });
    expect(s.timezone).toBe('UTC'); // mantém o que foi setado antes
    expect(s.reviewWeekday).toBe(5);
  });
});
