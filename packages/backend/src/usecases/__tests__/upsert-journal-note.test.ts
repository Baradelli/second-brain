import type { NoteType } from '@cerebro/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import { dayRange } from '../../domain/day-range.js';
import { NotAJournalTypeError } from '../../domain/errors.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { CreateNote } from '../create-note.js';
import { EditNote } from '../edit-note.js';
import { FindNoteOfTheDay } from '../find-note-of-the-day.js';
import { UpsertJournalNote } from '../upsert-journal-note.js';

const TZ = 'America/Sao_Paulo';
const DAY1 = new Date('2026-06-01T12:00:00.000Z'); // June 1st 09:00 SP
const DAY2 = new Date('2026-06-02T12:00:00.000Z'); // June 2nd 09:00 SP

const baseDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'texto' }] }],
};

describe('UpsertJournalNote', () => {
  let repo: NoteRepositoryFake;
  let useCase: UpsertJournalNote;

  beforeEach(() => {
    repo = new NoteRepositoryFake();
    useCase = new UpsertJournalNote(
      new FindNoteOfTheDay(repo),
      new CreateNote(repo),
      new EditNote(repo),
    );
  });

  it('1 — primeiro devocional do dia: cria, created=true, date=início do dia local', async () => {
    const { note, created } = await useCase.execute({
      userId: 'user-1',
      type: 'DEVOTIONAL',
      reference: DAY1,
      timezone: TZ,
      doc: baseDoc,
    });

    expect(created).toBe(true);
    expect(note.type).toBe('DEVOTIONAL');
    expect(note.date).toEqual(dayRange(DAY1, TZ, 'DAY').from);
    expect(repo.saved).toHaveLength(1);
  });

  it('2 — segundo devocional, create-or-get: retorna existente sem duplicar', async () => {
    const first = await useCase.execute({
      userId: 'user-1',
      type: 'DEVOTIONAL',
      reference: DAY1,
      timezone: TZ,
      doc: baseDoc,
    });

    const second = await useCase.execute({
      userId: 'user-1',
      type: 'DEVOTIONAL',
      reference: DAY1,
      timezone: TZ,
      doc: { type: 'doc', content: [] },
      mode: 'create-or-get',
    });

    expect(second.created).toBe(false);
    expect(second.note.id).toBe(first.note.id);
    expect(repo.saved).toHaveLength(1); // sem duplicata
  });

  it('3 — segundo devocional, create-or-update: atualiza doc/plainText, created=false', async () => {
    await useCase.execute({
      userId: 'user-1',
      type: 'DEVOTIONAL',
      reference: DAY1,
      timezone: TZ,
      doc: baseDoc,
    });

    const newDoc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'atualizado' }] },
      ],
    };
    const { note, created } = await useCase.execute({
      userId: 'user-1',
      type: 'DEVOTIONAL',
      reference: DAY1,
      timezone: TZ,
      doc: newDoc,
      mode: 'create-or-update',
    });

    expect(created).toBe(false);
    expect(note.plainText).toBe('atualizado');
    expect(repo.saved).toHaveLength(1); // ainda só uma nota
  });

  it('4 — DEVOTIONAL e REFLECTION no mesmo dia coexistem (unicidade é por tipo)', async () => {
    await useCase.execute({
      userId: 'user-1',
      type: 'DEVOTIONAL',
      reference: DAY1,
      timezone: TZ,
      doc: baseDoc,
    });
    const { created } = await useCase.execute({
      userId: 'user-1',
      type: 'REFLECTION',
      reference: DAY1,
      timezone: TZ,
      doc: baseDoc,
    });

    expect(created).toBe(true);
    expect(repo.saved).toHaveLength(2);
  });

  it('5 — dias diferentes criam notas distintas (borda UTC-3)', async () => {
    const day1 = await useCase.execute({
      userId: 'user-1',
      type: 'DEVOTIONAL',
      reference: DAY1,
      timezone: TZ,
      doc: baseDoc,
    });
    const day2 = await useCase.execute({
      userId: 'user-1',
      type: 'DEVOTIONAL',
      reference: DAY2,
      timezone: TZ,
      doc: baseDoc,
    });

    expect(day1.created).toBe(true);
    expect(day2.created).toBe(true);
    expect(day1.note.id).not.toBe(day2.note.id);
    expect(repo.saved).toHaveLength(2);
  });

  it('6 — type STUDY_NOTE lança NotAJournalTypeError', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        type: 'STUDY_NOTE' as NoteType,
        reference: DAY1,
        timezone: TZ,
        doc: baseDoc,
      }),
    ).rejects.toThrow(NotAJournalTypeError);
  });

  it('7 — scope WEEK: unicidade é por semana (não por dia)', async () => {
    const MON = new Date('2026-06-01T12:00:00.000Z'); // segunda
    const WED = new Date('2026-06-03T12:00:00.000Z'); // quarta, mesma semana

    const first = await useCase.execute({
      userId: 'user-1',
      type: 'DEVOTIONAL',
      scope: 'WEEK',
      reference: MON,
      timezone: TZ,
      doc: baseDoc,
    });
    const second = await useCase.execute({
      userId: 'user-1',
      type: 'DEVOTIONAL',
      scope: 'WEEK',
      reference: WED,
      timezone: TZ,
      doc: baseDoc,
      mode: 'create-or-get',
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.note.id).toBe(first.note.id);
    expect(repo.saved).toHaveLength(1);
  });
});
