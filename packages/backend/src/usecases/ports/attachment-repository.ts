import type { Attachment } from '../../domain/attachment.js';

export interface AttachmentRepository {
  save(attachment: Attachment): Promise<Attachment>;
  listByNote(noteId: string): Promise<Attachment[]>;
}
