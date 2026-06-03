import type { NoteScope, NoteType } from '@cerebro/shared';
import { DateTime } from 'luxon';

import type { Capture } from '../domain/capture.js';
import {
  CaptureAlreadyProcessedError,
  CaptureNotFoundError,
} from '../domain/errors.js';
import type { Note } from '../domain/note.js';
import { textToDoc } from '../domain/text-to-doc.js';
import { CreateNote } from './create-note.js';
import type { CaptureRepository } from './ports/capture-repository.js';

export interface PromoteCaptureToNoteInput {
  captureId: string;
  type: NoteType;
  scope?: NoteScope;
  reference: Date;
  timezone: string;
  title?: string;
}

export class PromoteCaptureToNote {
  constructor(
    private captureRepo: CaptureRepository,
    private createNote: CreateNote,
  ) {}

  async execute(
    input: PromoteCaptureToNoteInput,
  ): Promise<{ note: Note; capture: Capture }> {
    const capture = await this.captureRepo.byId(input.captureId);
    if (!capture) throw new CaptureNotFoundError(input.captureId);
    if (capture.status !== 'PENDING')
      throw new CaptureAlreadyProcessedError(input.captureId);

    const date = DateTime.fromJSDate(input.reference, { zone: input.timezone })
      .startOf('day')
      .toUTC()
      .toJSDate();

    const note = await this.createNote.execute({
      userId: capture.userId,
      type: input.type,
      scope: input.scope ?? 'DAY',
      date,
      title: input.title,
      doc: textToDoc(capture.text),
      labelIds: capture.labelIds,
    });

    const now = new Date();
    const updatedCapture = await this.captureRepo.update(input.captureId, {
      status: 'PROCESSED',
      processedAt: now,
      promotedToType: 'note',
      promotedToId: note.id,
    });

    return { note, capture: updatedCapture };
  }
}
