import type {
  CaptureResponse,
  NoteResponse,
  ResourceResponse,
  SearchResultResponse,
} from '@cerebro/shared';
import { describe, expect, it } from 'vitest';

import {
  captureResultToTab,
  noteResultToTab,
  resourceResultToTab,
  searchResultsToTabs,
} from '../search-to-tab.js';

const note = (p: Partial<NoteResponse>): NoteResponse =>
  ({ id: 'n1', plainText: '', ...p }) as NoteResponse;
const resource = (p: Partial<ResourceResponse>): ResourceResponse =>
  ({ id: 'r1', title: 'Livro', ...p }) as ResourceResponse;
const capture = (p: Partial<CaptureResponse>): CaptureResponse =>
  ({ id: 'c1', text: 'lembrar disso', ...p }) as CaptureResponse;

describe('noteResultToTab', () => {
  it('usa o título da nota quando há um', () => {
    expect(
      noteResultToTab(note({ id: 'n2', title: 'Sobre hábitos' }), 'x'),
    ).toEqual({ kind: 'note', id: 'n2', title: 'Sobre hábitos' });
  });

  it('cai na primeira linha do texto quando não há título', () => {
    expect(
      noteResultToTab(
        note({ id: 'n3', plainText: '  \nPrimeira linha\nsegunda' }),
        'x',
      ),
    ).toEqual({ kind: 'note', id: 'n3', title: 'Primeira linha' });
  });

  it('usa o fallback quando não há título nem texto', () => {
    expect(
      noteResultToTab(note({ id: 'n4', plainText: '   ' }), 'Sem título'),
    ).toEqual({
      kind: 'note',
      id: 'n4',
      title: 'Sem título',
    });
  });
});

describe('resourceResultToTab', () => {
  it('mapeia recurso para a aba resource (placeholder forward-compatible)', () => {
    expect(
      resourceResultToTab(resource({ id: 'r2', title: 'Atomic Habits' })),
    ).toEqual({
      kind: 'resource',
      id: 'r2',
      title: 'Atomic Habits',
    });
  });

  it('devolve null quando o recurso não tem título', () => {
    expect(resourceResultToTab(resource({ title: '   ' }))).toBeNull();
  });
});

describe('captureResultToTab', () => {
  it('devolve null — captura não tem aba própria', () => {
    expect(captureResultToTab(capture({}))).toBeNull();
  });
});

describe('searchResultsToTabs', () => {
  it('achata notas e recursos em abas, pulando capturas', () => {
    const result: SearchResultResponse = {
      notes: [note({ id: 'n1', title: 'Nota A' })],
      resources: [resource({ id: 'r1', title: 'Recurso B' })],
      captures: [capture({ id: 'c1' })],
    };
    expect(searchResultsToTabs(result, 'fallback')).toEqual([
      { kind: 'note', id: 'n1', title: 'Nota A' },
      { kind: 'resource', id: 'r1', title: 'Recurso B' },
    ]);
  });

  it('descarta recursos sem título', () => {
    const result: SearchResultResponse = {
      notes: [],
      resources: [resource({ id: 'r1', title: '' })],
      captures: [],
    };
    expect(searchResultsToTabs(result, 'fallback')).toEqual([]);
  });

  it('devolve lista vazia para resultado vazio', () => {
    expect(
      searchResultsToTabs(
        { notes: [], resources: [], captures: [] },
        'fallback',
      ),
    ).toEqual([]);
  });
});
