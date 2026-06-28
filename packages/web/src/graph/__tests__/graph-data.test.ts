import type { NoteGraphResponse } from '@cerebro/shared';
import { describe, expect, it } from 'vitest';

import { toGraphData } from '../graph-data.js';

const FALLBACK = '(sem título)';

describe('toGraphData', () => {
  it('maps nodes and edges to the lib shape', () => {
    const response: NoteGraphResponse = {
      nodes: [
        { id: 'a', title: 'Nota A', type: 'NOTE' },
        { id: 'b', title: 'Nota B', type: 'DEVOTIONAL' },
      ],
      edges: [{ from: 'a', to: 'b' }],
    };

    const data = toGraphData(response, FALLBACK);

    expect(data.nodes).toEqual([
      { id: 'a', label: 'Nota A', type: 'NOTE' },
      { id: 'b', label: 'Nota B', type: 'DEVOTIONAL' },
    ]);
    expect(data.links).toEqual([{ source: 'a', target: 'b' }]);
  });

  it('falls back to the placeholder for empty/whitespace titles', () => {
    const response: NoteGraphResponse = {
      nodes: [
        { id: 'a', title: '', type: 'NOTE' },
        { id: 'b', title: '   ', type: 'NOTE' },
        { id: 'c', title: '  Trim  ', type: 'NOTE' },
      ],
      edges: [],
    };

    const data = toGraphData(response, FALLBACK);

    expect(data.nodes.map((n) => n.label)).toEqual([FALLBACK, FALLBACK, 'Trim']);
  });

  it('returns empty nodes and links for an empty graph', () => {
    const data = toGraphData({ nodes: [], edges: [] }, FALLBACK);
    expect(data).toEqual({ nodes: [], links: [] });
  });

  it('drops nodes whose type is filtered out', () => {
    const response: NoteGraphResponse = {
      nodes: [
        { id: 'a', title: 'A', type: 'NOTE' },
        { id: 'b', title: 'B', type: 'DEVOTIONAL' },
      ],
      edges: [],
    };

    const data = toGraphData(response, FALLBACK, new Set(['NOTE']));

    expect(data.nodes.map((n) => n.id)).toEqual(['a']);
  });

  it('drops dangling edges when one endpoint is filtered out', () => {
    const response: NoteGraphResponse = {
      nodes: [
        { id: 'a', title: 'A', type: 'NOTE' },
        { id: 'b', title: 'B', type: 'DEVOTIONAL' },
        { id: 'c', title: 'C', type: 'NOTE' },
      ],
      edges: [
        { from: 'a', to: 'b' }, // b filtered out → dropped
        { from: 'a', to: 'c' }, // both kept → survives
      ],
    };

    const data = toGraphData(response, FALLBACK, new Set(['NOTE']));

    expect(data.nodes.map((n) => n.id)).toEqual(['a', 'c']);
    expect(data.links).toEqual([{ source: 'a', target: 'c' }]);
  });

  it('drops all edges and nodes when the filter is empty', () => {
    const response: NoteGraphResponse = {
      nodes: [{ id: 'a', title: 'A', type: 'NOTE' }],
      edges: [{ from: 'a', to: 'a' }],
    };

    const data = toGraphData(response, FALLBACK, new Set());

    expect(data).toEqual({ nodes: [], links: [] });
  });
});
