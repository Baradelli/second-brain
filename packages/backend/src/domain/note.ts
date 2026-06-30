import type { NoteScope, NoteType } from '@cerebro/shared';

export interface Note {
  id: string;
  userId: string;
  type: NoteType;
  scope: NoteScope;
  date: Date;
  title?: string;
  doc: unknown;
  plainText: string;
  goalId?: string;
  resourceId?: string;
  eventId?: string;
  labelIds?: string[];
  status: 'ACTIVE' | 'ARCHIVED';
  archivedAt?: Date | null;
  createdAt: Date;
}
