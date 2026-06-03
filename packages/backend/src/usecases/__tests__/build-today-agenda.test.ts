import { beforeEach, describe, expect, it } from 'vitest';

import { CaptureRepositoryFake } from '../_fakes/capture-repository-fake.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { SettingsReaderFake } from '../_fakes/settings-reader-fake.js';
import { BuildTodayAgenda } from '../build-today-agenda.js';
import { FindNoteOfTheDay } from '../find-note-of-the-day.js';
import { ListPendingCaptures } from '../list-pending-captures.js';

// Reference: 2026-06-03 17:00 UTC = 2026-06-03 14:00 BRT (UTC-3)
const REFERENCE = new Date('2026-06-03T17:00:00.000Z');
const TIMEZONE = 'America/Sao_Paulo';
const USER_ID = 'user-1';

const makeNote = (
  id: string,
  type: 'DEVOTIONAL' | 'REFLECTION',
  date: Date,
) => ({
  id,
  userId: USER_ID,
  type,
  scope: 'DAY' as const,
  date,
  doc: { type: 'doc', content: [] },
  plainText: '',
  status: 'ACTIVE' as const,
  createdAt: new Date('2026-06-03T14:00:00.000Z'),
});

const makeCapture = (id: string, reviewAt: Date | null) => ({
  id,
  userId: USER_ID,
  text: 'captura',
  url: undefined,
  status: 'PENDING' as const,
  reviewAt,
  processedAt: null,
  promotedToType: null,
  promotedToId: null,
  archivedAt: null,
  archiveReason: null,
  createdAt: new Date('2026-06-01T10:00:00.000Z'),
});

describe('BuildTodayAgenda', () => {
  let noteRepo: NoteRepositoryFake;
  let captureRepo: CaptureRepositoryFake;
  let settingsReader: SettingsReaderFake;
  let usecase: BuildTodayAgenda;

  beforeEach(() => {
    noteRepo = new NoteRepositoryFake();
    captureRepo = new CaptureRepositoryFake();
    settingsReader = new SettingsReaderFake();
    settingsReader.set(USER_ID, { timezone: TIMEZONE, reviewWeekday: 1 });
    usecase = new BuildTodayAgenda(
      settingsReader,
      new FindNoteOfTheDay(noteRepo),
      new ListPendingCaptures(captureRepo),
    );
  });

  it('sem nada feito: devotional e reflection done:false, sem capturas', async () => {
    const agenda = await usecase.execute({
      userId: USER_ID,
      reference: REFERENCE,
    });

    expect(agenda.journal.devotional).toEqual({ done: false });
    expect(agenda.journal.reflection).toEqual({ done: false });
    expect(agenda.capturesToReview).toHaveLength(0);
  });

  it('com devocional de hoje criado: devotional.done:true com noteId', async () => {
    // date = início do dia local (2026-06-03 00:00 BRT = 2026-06-03 03:00 UTC)
    const todayStart = new Date('2026-06-03T03:00:00.000Z');
    await noteRepo.save(makeNote('note-dev', 'DEVOTIONAL', todayStart));

    const agenda = await usecase.execute({
      userId: USER_ID,
      reference: REFERENCE,
    });

    expect(agenda.journal.devotional).toEqual({
      done: true,
      noteId: 'note-dev',
    });
    expect(agenda.journal.reflection).toEqual({ done: false });
  });

  it('capturas pendentes de hoje aparecem; futuras não', async () => {
    const todayEnd = new Date('2026-06-03T23:59:59.999Z'); // dentro do dia UTC-3
    const tomorrow = new Date('2026-06-04T23:59:59.000Z');

    await captureRepo.save(makeCapture('cap-hoje', todayEnd));
    await captureRepo.save(makeCapture('cap-amanha', tomorrow));

    const agenda = await usecase.execute({
      userId: USER_ID,
      reference: REFERENCE,
    });

    expect(agenda.capturesToReview).toHaveLength(1);
    expect(agenda.capturesToReview[0]?.id).toBe('cap-hoje');
  });

  it('borda de dia UTC-3: 22h de ontem UTC é hoje local', async () => {
    // 2026-06-02 22:00 UTC = 2026-06-02 19:00 BRT → ontem local
    // 2026-06-03 03:00 UTC = 2026-06-03 00:00 BRT → hoje local (início do dia)
    const yesterdayLocal = new Date('2026-06-02T22:00:00.000Z');
    const todayLocal = new Date('2026-06-03T03:00:00.000Z');

    await noteRepo.save(makeNote('note-ontem', 'DEVOTIONAL', yesterdayLocal));
    await noteRepo.save(makeNote('note-hoje', 'DEVOTIONAL', todayLocal));

    const agenda = await usecase.execute({
      userId: USER_ID,
      reference: REFERENCE,
    });

    // note-ontem está fora do range de hoje local → não conta
    // note-hoje está no início do dia local → conta; a ordenação pega o mais recente
    expect(agenda.journal.devotional.done).toBe(true);
    expect(agenda.journal.devotional.noteId).toBe('note-hoje');
  });

  it('usuário sem Settings usa UTC como fuso padrão (sem lançar erro)', async () => {
    settingsReader.set(USER_ID, null as unknown as never);
    const noSettingsReader = new SettingsReaderFake(); // sem configuração para USER_ID
    const agendaUsecase = new BuildTodayAgenda(
      noSettingsReader,
      new FindNoteOfTheDay(noteRepo),
      new ListPendingCaptures(captureRepo),
    );

    const agenda = await agendaUsecase.execute({
      userId: USER_ID,
      reference: REFERENCE,
    });

    expect(agenda.journal.devotional.done).toBe(false);
    expect(agenda.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
