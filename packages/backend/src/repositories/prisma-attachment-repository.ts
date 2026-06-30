import type { PrismaClient } from '@prisma/client';

import type { Attachment } from '../domain/attachment.js';
import type { AttachmentRepository } from '../usecases/ports/attachment-repository.js';

function toDomain(record: {
  id: string;
  userId: string;
  url: string;
  type: string;
  mimeType: string | null;
  name: string | null;
  size: number | null;
  transcription: string | null;
  ocrStatus: string | null;
  noteId: string | null;
  captureId: string | null;
  createdAt: Date;
}): Attachment {
  return {
    id: record.id,
    userId: record.userId,
    url: record.url,
    type: record.type,
    mimeType: record.mimeType,
    name: record.name,
    size: record.size,
    transcription: record.transcription,
    ocrStatus: record.ocrStatus,
    noteId: record.noteId,
    captureId: record.captureId,
    createdAt: record.createdAt,
  };
}

export class PrismaAttachmentRepository implements AttachmentRepository {
  constructor(private prisma: PrismaClient) {}

  async save(attachment: Attachment): Promise<Attachment> {
    const record = await this.prisma.attachment.create({
      data: {
        id: attachment.id,
        userId: attachment.userId,
        url: attachment.url,
        type: attachment.type,
        mimeType: attachment.mimeType,
        name: attachment.name,
        size: attachment.size,
        transcription: attachment.transcription,
        ocrStatus: attachment.ocrStatus,
        noteId: attachment.noteId,
        captureId: attachment.captureId,
        createdAt: attachment.createdAt,
      },
    });
    return toDomain(record);
  }

  async listByNote(noteId: string): Promise<Attachment[]> {
    const records = await this.prisma.attachment.findMany({
      where: { noteId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map(toDomain);
  }

  async listByCapture(captureId: string): Promise<Attachment[]> {
    const records = await this.prisma.attachment.findMany({
      where: { captureId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map(toDomain);
  }
}
