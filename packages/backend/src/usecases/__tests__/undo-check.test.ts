import { beforeEach, describe, expect, it } from 'vitest';

import { EventNotFoundError, InvalidCheckError } from '../../domain/errors.js';
import type { Event } from '../../domain/event.js';
import { EventRepositoryFake } from '../_fakes/event-repository-fake.js';
import { UndoCheck } from '../undo-check.js';

const USER = 'user-1';

function makeEvent(overrides: Partial<Event> & { id: string }): Event {
  return {
    userId: USER,
    goalId: 'g-1',
    type: 'done',
    value: null,
    reason: null,
    occurredAt: new Date('2026-06-04T08:00:00.000Z'),
    createdAt: new Date('2026-06-04T08:00:00.000Z'),
    ...overrides,
  };
}

describe('UndoCheck', () => {
  let events: EventRepositoryFake;
  let useCase: UndoCheck;

  beforeEach(() => {
    events = new EventRepositoryFake();
    useCase = new UndoCheck(events);
  });

  it('hard-deletes a done event', async () => {
    await events.save(makeEvent({ id: 'e1', type: 'done' }));

    await useCase.execute({ eventId: 'e1', userId: USER });

    expect(await events.byId('e1')).toBeNull();
    expect(events.saved).toHaveLength(0);
  });

  it('throws EventNotFoundError for unknown id or wrong owner', async () => {
    await events.save(makeEvent({ id: 'e1', userId: 'owner' }));

    await expect(
      useCase.execute({ eventId: 'e1', userId: 'intruder' }),
    ).rejects.toThrow(EventNotFoundError);
    await expect(
      useCase.execute({ eventId: 'ghost', userId: USER }),
    ).rejects.toThrow(EventNotFoundError);

    // unchanged
    expect(await events.byId('e1')).not.toBeNull();
  });

  it('refuses to undo a skip event', async () => {
    await events.save(makeEvent({ id: 'e1', type: 'skip', reason: 'doente' }));

    await expect(
      useCase.execute({ eventId: 'e1', userId: USER }),
    ).rejects.toThrow(InvalidCheckError);
    expect(await events.byId('e1')).not.toBeNull();
  });
});
