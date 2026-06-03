import type { NoteScope, NoteType } from '@cerebro/shared';

import { NotARecapScopeError } from '../domain/errors.js';
import type { Note } from '../domain/note.js';
import type { UpsertJournalNote } from './upsert-journal-note.js';

const RECAP_SCOPES: NoteScope[] = ['WEEK', 'MONTH', 'YEAR'];

export interface UpsertRecapInput {
  userId: string;
  type: 'DEVOTIONAL' | 'REFLECTION';
  scope: NoteScope;
  reference: Date;
  timezone: string;
  recapWeekday?: number; // 0=Sun, 1=Mon (default), ..., 6=Sat — from Settings
  title?: string;
  doc: unknown;
  mode?: 'create-or-get' | 'create-or-update';
}

export class UpsertRecap {
  constructor(private upsertJournalNote: UpsertJournalNote) {}

  async execute(
    input: UpsertRecapInput,
  ): Promise<{ note: Note; created: boolean }> {
    if (!RECAP_SCOPES.includes(input.scope)) {
      throw new NotARecapScopeError(input.scope);
    }

    return this.upsertJournalNote.execute({
      userId: input.userId,
      type: input.type as NoteType,
      scope: input.scope,
      reference: input.reference,
      timezone: input.timezone,
      title: input.title,
      doc: input.doc,
      mode: input.mode,
      weekStartsOn: input.recapWeekday ?? 1,
    });
  }
}
