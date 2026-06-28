import type { NoteResponse } from '@cerebro/shared';
import { describe, expect, it } from 'vitest';

import {
  recapPeriodFormat,
  recapTypeKey,
  sortRecapsByDateDesc,
} from '../recaps-display.js';

function note(over: Partial<NoteResponse> = {}): NoteResponse {
  return {
    id: 'n1',
    type: 'REFLECTION',
    scope: 'WEEK',
    status: 'ACTIVE',
    title: undefined,
    date: '2026-06-15T12:00:00.000Z',
    doc: {},
    labelIds: [],
    resourceId: null,
    goalId: null,
    createdAt: '2026-06-15T12:00:00.000Z',
    updatedAt: '2026-06-15T12:00:00.000Z',
    ...over,
  } as unknown as NoteResponse;
}

describe('recapPeriodFormat', () => {
  it('WEEK aponta para o início da semana ISO (segunda)', () => {
    const f = recapPeriodFormat('2026-06-17T12:00:00.000Z', 'WEEK'); // quarta
    expect(f.scope).toBe('WEEK');
    expect(f.at.toFormat('yyyy-MM-dd')).toBe('2026-06-15'); // segunda
  });
  it('MONTH aponta para o dia 1', () => {
    const f = recapPeriodFormat('2026-06-17T12:00:00.000Z', 'MONTH');
    expect(f.at.toFormat('yyyy-MM-dd')).toBe('2026-06-01');
  });
  it('YEAR aponta para 1 de janeiro', () => {
    const f = recapPeriodFormat('2026-06-17T12:00:00.000Z', 'YEAR');
    expect(f.at.toFormat('yyyy-MM-dd')).toBe('2026-01-01');
  });
});

describe('sortRecapsByDateDesc', () => {
  it('ordena do mais recente ao mais antigo sem mutar', () => {
    const a = note({ id: 'a', date: '2026-06-01T00:00:00.000Z' });
    const b = note({ id: 'b', date: '2026-06-20T00:00:00.000Z' });
    const c = note({ id: 'c', date: '2026-06-10T00:00:00.000Z' });
    const input = [a, b, c];
    const out = sortRecapsByDateDesc(input);
    expect(out.map((n) => n.id)).toEqual(['b', 'c', 'a']);
    expect(input.map((n) => n.id)).toEqual(['a', 'b', 'c']); // original intacto
  });
});

describe('recapTypeKey', () => {
  it('mapeia o tipo para a chave do editor', () => {
    expect(recapTypeKey('DEVOTIONAL')).toBe('editor.type.devotional');
    expect(recapTypeKey('REFLECTION')).toBe('editor.type.reflection');
  });
});
