import { describe, expect, it } from 'vitest';

import { backlinkDisplayTitle } from '../backlink-display.js';

describe('backlinkDisplayTitle', () => {
  it('returns the title when present', () => {
    expect(
      backlinkDisplayTitle({ title: 'Minha nota' }, '(sem título)'),
    ).toBe('Minha nota');
  });

  it('falls back when the title is empty', () => {
    expect(backlinkDisplayTitle({ title: '' }, '(sem título)')).toBe(
      '(sem título)',
    );
  });

  it('falls back when the title is only whitespace', () => {
    expect(backlinkDisplayTitle({ title: '   ' }, '(sem título)')).toBe(
      '(sem título)',
    );
  });

  it('trims surrounding whitespace from the title', () => {
    expect(backlinkDisplayTitle({ title: '  Nota  ' }, '(sem título)')).toBe(
      'Nota',
    );
  });
});
