import { describe, it, expect, beforeEach } from 'vitest';
import { UpsertRecap } from '../upsert-recap.js';
import { UpsertJournalNote } from '../upsert-journal-note.js';
import { CreateNote } from '../create-note.js';
import { EditNote } from '../edit-note.js';
import { FindNoteOfTheDay } from '../find-note-of-the-day.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { NotARecapScopeError } from '../../domain/errors.js';
import { dayRange } from '../../domain/day-range.js';
import type { NoteScope } from '@cerebro/shared';

const TZ = 'America/Sao_Paulo';
const REF = new Date('2026-06-02T12:00:00.000Z'); // Tuesday June 2nd, 09:00 SP
const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'recap' }] }] };

describe('UpsertRecap', () => {
  let repo: NoteRepositoryFake;
  let useCase: UpsertRecap;

  beforeEach(() => {
    repo = new NoteRepositoryFake();
    const upsertJournal = new UpsertJournalNote(
      new FindNoteOfTheDay(repo),
      new CreateNote(repo),
      new EditNote(repo),
    );
    useCase = new UpsertRecap(upsertJournal);
  });

  it('1 — cria recap da semana com date=início da semana local (recapWeekday=1, segunda)', async () => {
    const { note, created } = await useCase.execute({
      userId: 'user-1', type: 'REFLECTION', scope: 'WEEK',
      reference: REF, timezone: TZ, recapWeekday: 1, doc,
    });

    expect(created).toBe(true);
    // June 2 (Tuesday) with Monday start → weekStart = June 1 03:00 UTC
    expect(note.date).toEqual(dayRange(REF, TZ, 'WEEK', 1).from);
  });

  it('2 — segunda chamada na mesma semana (create-or-get) → retorna existente, sem duplicata', async () => {
    const WED = new Date('2026-06-03T12:00:00.000Z'); // Wednesday, same week

    await useCase.execute({ userId: 'user-1', type: 'REFLECTION', scope: 'WEEK', reference: REF, timezone: TZ, recapWeekday: 1, doc });
    const { note, created } = await useCase.execute({
      userId: 'user-1', type: 'REFLECTION', scope: 'WEEK',
      reference: WED, timezone: TZ, recapWeekday: 1, doc, mode: 'create-or-get',
    });

    expect(created).toBe(false);
    expect(repo.saved).toHaveLength(1);
    expect(note.date).toEqual(dayRange(REF, TZ, 'WEEK', 1).from);
  });

  it('3 — recap de MONTH usa o dia 1 do mês local como date', async () => {
    const { note, created } = await useCase.execute({
      userId: 'user-1', type: 'DEVOTIONAL', scope: 'MONTH',
      reference: REF, timezone: TZ, doc,
    });

    expect(created).toBe(true);
    // June 1 00:00 SP = June 1 03:00 UTC
    expect(note.date).toEqual(dayRange(REF, TZ, 'MONTH').from);
  });

  it('4 — recap de YEAR usa 1º de janeiro local como date', async () => {
    const { note, created } = await useCase.execute({
      userId: 'user-1', type: 'DEVOTIONAL', scope: 'YEAR',
      reference: REF, timezone: TZ, doc,
    });

    expect(created).toBe(true);
    // Jan 1 2026 00:00 SP = Jan 1 2026 03:00 UTC
    expect(note.date).toEqual(dayRange(REF, TZ, 'YEAR').from);
  });

  it('5 — duas semanas diferentes geram duas notas distintas', async () => {
    const WEEK2 = new Date('2026-06-09T12:00:00.000Z'); // next week Tuesday

    const first = await useCase.execute({ userId: 'user-1', type: 'REFLECTION', scope: 'WEEK', reference: REF,   timezone: TZ, recapWeekday: 1, doc });
    const second = await useCase.execute({ userId: 'user-1', type: 'REFLECTION', scope: 'WEEK', reference: WEEK2, timezone: TZ, recapWeekday: 1, doc });

    expect(first.created).toBe(true);
    expect(second.created).toBe(true);
    expect(first.note.id).not.toBe(second.note.id);
    expect(repo.saved).toHaveLength(2);
  });

  it('6 — scope DAY lança NotARecapScopeError', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1', type: 'REFLECTION', scope: 'DAY' as NoteScope,
        reference: REF, timezone: TZ, doc,
      }),
    ).rejects.toThrow(NotARecapScopeError);
  });

  it('7 — recapWeekday=0 (domingo) muda o início da semana para o domingo anterior', async () => {
    // June 2 (Tuesday) with Sunday start → weekStart = May 31 (Sunday)
    const { note } = await useCase.execute({
      userId: 'user-1', type: 'REFLECTION', scope: 'WEEK',
      reference: REF, timezone: TZ, recapWeekday: 0, doc,
    });

    expect(note.date).toEqual(dayRange(REF, TZ, 'WEEK', 0).from);
    // May 31 00:00 SP = May 31 03:00 UTC
    expect(note.date).toEqual(new Date('2026-05-31T03:00:00.000Z'));
  });
});
