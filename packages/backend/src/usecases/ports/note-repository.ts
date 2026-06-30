import type { NoteScope, NoteType } from '@cerebro/shared';

import type { Note } from '../../domain/note.js';

export interface NoteFilter {
  userId: string;
  type?: NoteType;
  scope?: NoteScope;
  resourceId?: string;
  from?: Date;
  to?: Date;
  status?: 'ACTIVE' | 'ARCHIVED';
}

export interface NoteRepository {
  save(note: Note): Promise<Note>;
  byId(id: string): Promise<Note | null>;
  find(filter: NoteFilter): Promise<Note[]>;
  update(id: string, patch: Partial<Note>): Promise<Note>;
  delete(id: string): Promise<void>; // hard delete — só notas arquivadas e sem referências
}
