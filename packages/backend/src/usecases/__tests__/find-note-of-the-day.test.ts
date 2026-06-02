import { describe, it, expect, beforeEach } from 'vitest';
import { FindNoteOfTheDay } from '../find-note-of-the-day.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { dayRange } from '../../domain/day-range.js';
import type { Note } from '../../domain/note.js';

const TZ = 'America/Sao_Paulo';
// reference = June 2nd 2026 12:00 UTC = 09:00 São Paulo (clearly inside June 2nd local day)
const TODAY_REF = new Date('2026-06-02T12:00:00.000Z');

function makeNote(overrides: Partial<Note>): Note {
  return {
    id: 'note-1',
    userId: 'user-1',
    type: 'DEVOTIONAL',
    scope: 'DAY',
    date: new Date('2026-06-02T12:00:00.000Z'),
    doc: {},
    plainText: '',
    status: 'ACTIVE',
    createdAt: new Date('2026-06-02T12:00:00.000Z'),
    ...overrides,
  };
}

describe('FindNoteOfTheDay', () => {
  let repo: NoteRepositoryFake;
  let useCase: FindNoteOfTheDay;

  beforeEach(() => {
    repo = new NoteRepositoryFake();
    useCase = new FindNoteOfTheDay(repo);
  });

  it("finds today's devotional when it exists", async () => {
    // Note date is within today's range (June 2 03:00 UTC to June 3 02:59:59.999 UTC)
    const todayNote = makeNote({ id: 'today', date: new Date('2026-06-02T15:00:00.000Z') });
    await repo.save(todayNote);

    const result = await useCase.execute({
      userId: 'user-1',
      type: 'DEVOTIONAL',
      reference: TODAY_REF,
      timezone: TZ,
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe('today');
  });

  it('returns null when no note exists for today', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      type: 'DEVOTIONAL',
      reference: TODAY_REF,
      timezone: TZ,
    });

    expect(result).toBeNull();
  });

  it("does not return yesterday's note (timezone border)", async () => {
    // Note date = June 1st 22:00 São Paulo = June 2nd 01:00 UTC
    // This is INSIDE June 1st SP local day, NOT June 2nd
    const yesterdayNote = makeNote({ id: 'yesterday', date: new Date('2026-06-02T01:00:00.000Z') });
    await repo.save(yesterdayNote);

    // Querying for June 2nd SP (reference = June 2 12:00 UTC = 09:00 SP)
    const result = await useCase.execute({
      userId: 'user-1',
      type: 'DEVOTIONAL',
      reference: TODAY_REF,
      timezone: TZ,
    });

    // The note at 01:00 UTC on June 2nd = 22:00 SP June 1st should NOT be found for June 2nd
    expect(result).toBeNull();
  });

  it('returns the most recent note when multiple exist', async () => {
    const { from, to } = dayRange(TODAY_REF, TZ, 'DAY');
    const midRange = new Date((from.getTime() + to.getTime()) / 2);

    await repo.save(makeNote({ id: 'older',  date: from,    createdAt: new Date('2026-06-02T09:00:00.000Z') }));
    await repo.save(makeNote({ id: 'newer',  date: midRange, createdAt: new Date('2026-06-02T10:00:00.000Z') }));

    const result = await useCase.execute({
      userId: 'user-1',
      type: 'DEVOTIONAL',
      reference: TODAY_REF,
      timezone: TZ,
    });

    expect(result!.id).toBe('newer');
  });
});
