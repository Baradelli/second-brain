import type { PublicationStageInput } from '@cerebro/shared';
import { describe, expect, it } from 'vitest';

import {
  advanceActionKey,
  formatLabelKey,
  nextStage,
  publicationLabel,
  sourceLabelKey,
  stageLabelKey,
} from '../publication-display.js';

describe('publicationLabel', () => {
  it('uses the title when present, trimming whitespace', () => {
    expect(publicationLabel({ title: '  Meu post  ' }, 'fallback')).toBe(
      'Meu post',
    );
  });

  it('falls back when the title is empty or whitespace', () => {
    expect(publicationLabel({ title: '   ' }, 'Sem título')).toBe('Sem título');
  });
});

describe('nextStage', () => {
  it('advances idea → draft', () => {
    expect(nextStage('idea')).toBe('draft');
  });

  it('advances draft → published', () => {
    expect(nextStage('draft')).toBe('published');
  });

  it('published is the end of the line', () => {
    expect(nextStage('published')).toBeNull();
  });

  it('never goes backwards (funnel only advances)', () => {
    const order: PublicationStageInput[] = ['idea', 'draft', 'published'];
    for (const stage of order) {
      const next = nextStage(stage);
      if (next) {
        expect(order.indexOf(next)).toBeGreaterThan(order.indexOf(stage));
      }
    }
  });
});

describe('label key derivation', () => {
  it('derives the stage label key', () => {
    expect(stageLabelKey('idea')).toBe('publish.stage.idea');
    expect(stageLabelKey('published')).toBe('publish.stage.published');
  });

  it('derives the format label key', () => {
    expect(formatLabelKey('linkedin')).toBe('publish.format.linkedin');
    expect(formatLabelKey('video')).toBe('publish.format.video');
  });

  it('derives the source label key', () => {
    expect(sourceLabelKey('study_item')).toBe('publish.source.study_item');
    expect(sourceLabelKey('recap')).toBe('publish.source.recap');
  });
});

describe('advanceActionKey', () => {
  it('idea advances "to draft"', () => {
    expect(advanceActionKey('idea')).toBe('publish.action.toDraft');
  });

  it('draft advances "to published"', () => {
    expect(advanceActionKey('draft')).toBe('publish.action.toPublished');
  });

  it('published has no advance action', () => {
    expect(advanceActionKey('published')).toBeNull();
  });
});
