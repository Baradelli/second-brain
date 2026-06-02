import { describe, it, expect, beforeEach } from 'vitest';
import { CreateCapture } from '../create-capture.js';
import { CaptureRepositoryFake } from '../_fakes/capture-repository-fake.js';
import { SettingsReaderFake } from '../_fakes/settings-reader-fake.js';
import { createCaptureSchema } from '@cerebro/shared';

const TZ = 'America/Sao_Paulo';
// Fixed "now": June 2 2026 09:00 SP (Tuesday)
const NOW = new Date('2026-06-02T12:00:00.000Z');
const USER = 'user-1';

describe('CreateCapture', () => {
  let repo: CaptureRepositoryFake;
  let settings: SettingsReaderFake;
  let useCase: CreateCapture;

  beforeEach(() => {
    repo = new CaptureRepositoryFake();
    settings = new SettingsReaderFake();
    settings.set(USER, { timezone: TZ, reviewWeekday: 0 }); // Sunday review
    useCase = new CreateCapture(repo, settings);
  });

  it('1 — cria captura com campos mínimos: status PENDING, id, createdAt', async () => {
    const capture = await useCase.execute({ userId: USER, text: 'ideia rápida' }, NOW);

    expect(capture.id).toBeTruthy();
    expect(capture.status).toBe('PENDING');
    expect(capture.text).toBe('ideia rápida');
    expect(capture.createdAt).toBeInstanceOf(Date);
    expect(capture.processedAt).toBeNull();
    expect(capture.archivedAt).toBeNull();
  });

  it('2 — reviewAt ausente → calculado para o próximo reviewWeekday no fuso correto', async () => {
    // NOW = Tuesday June 2; reviewWeekday = 0 (Sunday) → next Sunday = June 7
    const capture = await useCase.execute({ userId: USER, text: 'captura' }, NOW);

    // June 7 00:00 SP = June 7 03:00 UTC
    expect(capture.reviewAt).toEqual(new Date('2026-06-07T03:00:00.000Z'));
  });

  it('3 — reviewAt enviado no input → respeitado como veio', async () => {
    const customDate = new Date('2026-06-10T00:00:00.000Z');
    const capture = await useCase.execute(
      { userId: USER, text: 'captura', reviewAt: customDate },
      NOW,
    );

    expect(capture.reviewAt).toEqual(customDate);
  });

  it('4 — text vazio → rejeitado pelo schema Zod', () => {
    const result = createCaptureSchema.safeParse({ userId: USER, text: '' });
    expect(result.success).toBe(false);
  });

  it('5 — se hoje já é o reviewWeekday, reviewAt = hoje (não próxima semana)', async () => {
    // Monday June 1 09:00 SP; reviewWeekday = 1 (Monday) → today
    settings.set(USER, { timezone: TZ, reviewWeekday: 1 });
    const mondayNow = new Date('2026-06-01T12:00:00.000Z');

    const capture = await useCase.execute({ userId: USER, text: 'captura' }, mondayNow);

    // June 1 00:00 SP = June 1 03:00 UTC
    expect(capture.reviewAt).toEqual(new Date('2026-06-01T03:00:00.000Z'));
  });

  it('6 — chama repo.save exatamente uma vez com a captura montada', async () => {
    await useCase.execute({ userId: USER, text: 'teste' }, NOW);

    expect(repo.saved).toHaveLength(1);
    expect(repo.saved[0]?.userId).toBe(USER);
    expect(repo.saved[0]?.status).toBe('PENDING');
  });
});
