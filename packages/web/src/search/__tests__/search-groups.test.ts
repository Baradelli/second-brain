import type {
  CaptureResponse,
  NoteResponse,
  ResourceResponse,
  SearchResultResponse,
} from '@cerebro/shared';
import { describe, expect, it } from 'vitest';

import { searchResultsToGroups } from '../search-groups.js';

const note = (p: Partial<NoteResponse>): NoteResponse =>
  ({ id: 'n1', plainText: '', ...p }) as NoteResponse;
const resource = (p: Partial<ResourceResponse>): ResourceResponse =>
  ({ id: 'r1', title: 'Livro', ...p }) as ResourceResponse;
const capture = (p: Partial<CaptureResponse>): CaptureResponse =>
  ({ id: 'c1', text: 'lembrar disso', ...p }) as CaptureResponse;

describe('searchResultsToGroups', () => {
  it('agrupa por tipo e conta o total', () => {
    const result: SearchResultResponse = {
      notes: [note({ id: 'n1', title: 'Nota A' })],
      resources: [resource({ id: 'r1', title: 'Recurso B' })],
      captures: [capture({ id: 'c1', text: 'captura C' })],
    };
    const groups = searchResultsToGroups(result, 'fallback');
    expect(groups.notes).toHaveLength(1);
    expect(groups.resources).toHaveLength(1);
    expect(groups.captures).toHaveLength(1);
    expect(groups.total).toBe(3);
  });

  it('usa o mesmo título/aba que o switcher para notas', () => {
    const groups = searchResultsToGroups(
      {
        notes: [note({ id: 'n2', title: 'Sobre hábitos' })],
        resources: [],
        captures: [],
      },
      'fallback',
    );
    expect(groups.notes[0]).toEqual({
      id: 'n2',
      title: 'Sobre hábitos',
      tab: { kind: 'note', id: 'n2', title: 'Sobre hábitos' },
    });
  });

  it('cai no fallback de título quando a nota não tem título nem texto', () => {
    const groups = searchResultsToGroups(
      {
        notes: [note({ id: 'n3', plainText: '   ' })],
        resources: [],
        captures: [],
      },
      'Sem título',
    );
    expect(groups.notes[0]?.title).toBe('Sem título');
  });

  it('mapeia recurso para uma aba abrível', () => {
    const groups = searchResultsToGroups(
      {
        notes: [],
        resources: [resource({ id: 'r2', title: 'Atomic Habits' })],
        captures: [],
      },
      'fallback',
    );
    expect(groups.resources[0]).toEqual({
      id: 'r2',
      title: 'Atomic Habits',
      tab: { kind: 'resource', id: 'r2', title: 'Atomic Habits' },
    });
  });

  it('recurso sem título exibe o título cru mas não abre aba (tab null)', () => {
    const groups = searchResultsToGroups(
      {
        notes: [],
        resources: [resource({ id: 'r3', title: '' })],
        captures: [],
      },
      'fallback',
    );
    expect(groups.resources[0]?.tab).toBeNull();
  });

  it('captura aparece como linha, mas não abre aba (tab null)', () => {
    const groups = searchResultsToGroups(
      {
        notes: [],
        resources: [],
        captures: [capture({ id: 'c2', text: 'ideia solta' })],
      },
      'fallback',
    );
    expect(groups.captures[0]).toEqual({
      id: 'c2',
      title: 'ideia solta',
      tab: null,
    });
  });

  it('resultado vazio tem total 0', () => {
    const groups = searchResultsToGroups(
      { notes: [], resources: [], captures: [] },
      'fallback',
    );
    expect(groups.total).toBe(0);
  });
});
