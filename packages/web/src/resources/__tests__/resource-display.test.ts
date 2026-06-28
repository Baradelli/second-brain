import type { ResourceResponse } from '@cerebro/shared';
import { describe, expect, it } from 'vitest';

import { nextStage, resourceLabel, STAGE_CYCLE } from '../resource-display.js';

describe('nextStage', () => {
  it('cycles backlog → in_progress → done → backlog', () => {
    expect(nextStage('backlog')).toBe('in_progress');
    expect(nextStage('in_progress')).toBe('done');
    expect(nextStage('done')).toBe('backlog');
  });

  it('matches the mobile stage cycle order', () => {
    expect(STAGE_CYCLE).toEqual(['backlog', 'in_progress', 'done']);
  });
});

describe('resourceLabel', () => {
  const base: Pick<ResourceResponse, 'title'> = { title: 'Atomic Habits' };

  it('uses the title when present', () => {
    expect(resourceLabel(base, 'fallback')).toBe('Atomic Habits');
  });

  it('trims surrounding whitespace', () => {
    expect(resourceLabel({ title: '  Deep Work  ' }, 'fallback')).toBe(
      'Deep Work',
    );
  });

  it('falls back when the title is empty or whitespace', () => {
    expect(resourceLabel({ title: '' }, 'Sem título')).toBe('Sem título');
    expect(resourceLabel({ title: '   ' }, 'Sem título')).toBe('Sem título');
  });
});
