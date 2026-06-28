import type {
  CaptureResponse,
  GoalResponse,
  NoteResponse,
  ResourceResponse,
} from '@cerebro/shared';
import type { PromoteCaptureResult } from '@cerebro/shared/client';
import { describe, expect, it } from 'vitest';

import { tabForPromoteResult } from '../promote-target.js';

const capture = { id: 'cap-1' } as CaptureResponse;

function noteResult(note: Partial<NoteResponse>): PromoteCaptureResult {
  return { note: note as NoteResponse, capture };
}

describe('tabForPromoteResult', () => {
  it('abre a aba da nota usando o título da nota quando há um', () => {
    const tab = tabForPromoteResult(
      noteResult({ id: 'note-1', title: 'Sobre o hábito' }),
      'fallback',
    );
    expect(tab).toEqual({
      kind: 'note',
      id: 'note-1',
      title: 'Sobre o hábito',
    });
  });

  it('usa o título de fallback quando a nota não tem título', () => {
    const tab = tabForPromoteResult(noteResult({ id: 'note-2' }), 'Nova nota');
    expect(tab).toEqual({ kind: 'note', id: 'note-2', title: 'Nova nota' });
  });

  it('usa o fallback quando o título da nota é só espaços', () => {
    const tab = tabForPromoteResult(
      noteResult({ id: 'note-3', title: '   ' }),
      'Nova nota',
    );
    expect(tab).toEqual({ kind: 'note', id: 'note-3', title: 'Nova nota' });
  });

  it('não abre aba ao promover para recurso (sem aba própria ainda)', () => {
    const result: PromoteCaptureResult = {
      resource: { id: 'res-1' } as ResourceResponse,
      capture,
    };
    expect(tabForPromoteResult(result, 'fallback')).toBeNull();
  });

  it('não abre aba ao promover para objetivo (sem aba própria ainda)', () => {
    const result: PromoteCaptureResult = {
      goal: { id: 'goal-1' } as GoalResponse,
      capture,
    };
    expect(tabForPromoteResult(result, 'fallback')).toBeNull();
  });
});
