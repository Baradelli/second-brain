import { randomUUID } from 'node:crypto';

import { attachFileSchema } from '@cerebro/shared';

import type { Attachment } from '../domain/attachment.js';
import type { AttachmentRepository } from './ports/attachment-repository.js';
import type { NoteRepository } from './ports/note-repository.js';

export class AttachFile {
  constructor(
    private repo: AttachmentRepository,
    private noteRepo: NoteRepository,
  ) {}

  async execute(input: unknown): Promise<Attachment> {
    const data = attachFileSchema.parse(input);

    const note = await this.noteRepo.byId(data.noteId);
    if (!note || note.userId !== data.userId) {
      throw new Error('Note not found');
    }

    const attachment: Attachment = {
      id: randomUUID(),
      userId: data.userId,
      noteId: data.noteId,
      captureId: null,
      url: data.url,
      type: data.type,
      mimeType: data.mimeType ?? null,
      name: data.name ?? null,
      size: data.size ?? null,
      transcription: null,
      ocrStatus: null,
      createdAt: new Date(),
    };

    return this.repo.save(attachment);
  }
}
