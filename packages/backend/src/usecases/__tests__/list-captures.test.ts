import { beforeEach,describe, expect, it } from 'vitest';

import type { Capture } from '../../domain/capture.js';
import { CaptureRepositoryFake } from '../_fakes/capture-repository-fake.js';
import { ListArchived } from '../list-archived.js';
import { ListPendingCaptures } from '../list-pending-captures.js';

const TZ = 'America/Sao_Paulo';
// June 2 2026 09:00 SP = 12:00 UTC — endOfDay SP = June 3 02:59:59.999 UTC
const REF = new Date('2026-06-02T12:00:00.000Z');

function makeCapture(overrides: Partial<Capture> & { id: string }): Capture {
  return {
    userId: 'user-1',
    text: 'cap',
    status: 'PENDING',
    reviewAt: new Date('2026-06-02T15:00:00.000Z'),
    processedAt: null,
    promotedToType: null,
    promotedToId: null,
    archivedAt: null,
    archiveReason: null,
    createdAt: new Date('2026-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('ListPendingCaptures', () => {
  let repo: CaptureRepositoryFake;
  let useCase: ListPendingCaptures;

  beforeEach(() => {
    repo = new CaptureRepositoryFake();
    useCase = new ListPendingCaptures(repo);
  });

  it('1 — retorna PENDING com reviewAt no passado ou hoje (fuso correto)', async () => {
    // June 2 15:00 UTC = dentro do dia June 2 SP (endOfDay = June 3 02:59:59 UTC)
    await repo.save(makeCapture({ id: 'due', reviewAt: new Date('2026-06-02T15:00:00.000Z') }));

    const result = await useCase.execute({ userId: 'user-1', reference: REF, timezone: TZ });

    expect(result.map(c => c.id)).toContain('due');
  });

  it('2 — não retorna capturas agendadas para depois de hoje', async () => {
    // June 3 15:00 UTC = June 3 12:00 SP = amanhã → fora do dia de hoje
    await repo.save(makeCapture({ id: 'future', reviewAt: new Date('2026-06-03T15:00:00.000Z') }));

    const result = await useCase.execute({ userId: 'user-1', reference: REF, timezone: TZ });

    expect(result.map(c => c.id)).not.toContain('future');
  });

  it('3 — inclui PENDING sem reviewAt (aparecem sempre para revisão)', async () => {
    await repo.save(makeCapture({ id: 'no-date', reviewAt: null }));

    const result = await useCase.execute({ userId: 'user-1', reference: REF, timezone: TZ });

    expect(result.map(c => c.id)).toContain('no-date');
  });

  it('4 — não retorna PROCESSED nem ARCHIVED', async () => {
    await repo.save(makeCapture({ id: 'due',       status: 'PENDING',   reviewAt: new Date('2026-06-02T15:00:00.000Z') }));
    await repo.save(makeCapture({ id: 'processed', status: 'PROCESSED', reviewAt: new Date('2026-06-02T15:00:00.000Z') }));
    await repo.save(makeCapture({ id: 'archived',  status: 'ARCHIVED',  reviewAt: new Date('2026-06-02T15:00:00.000Z') }));

    const result = await useCase.execute({ userId: 'user-1', reference: REF, timezone: TZ });
    const ids = result.map(c => c.id);

    expect(ids).toContain('due');
    expect(ids).not.toContain('processed');
    expect(ids).not.toContain('archived');
  });
});

describe('ListArchived', () => {
  let repo: CaptureRepositoryFake;
  let useCase: ListArchived;

  beforeEach(() => {
    repo = new CaptureRepositoryFake();
    useCase = new ListArchived(repo);
  });

  it('5 — retorna só ARCHIVED, ordenadas por archivedAt desc (mais recente primeiro)', async () => {
    await repo.save(makeCapture({ id: 'older',  status: 'ARCHIVED', archivedAt: new Date('2026-05-01T00:00:00.000Z') }));
    await repo.save(makeCapture({ id: 'newer',  status: 'ARCHIVED', archivedAt: new Date('2026-06-01T00:00:00.000Z') }));
    await repo.save(makeCapture({ id: 'pending', status: 'PENDING' }));

    const result = await useCase.execute({ userId: 'user-1' });

    expect(result.map(c => c.id)).toEqual(['newer', 'older']);
  });
});
