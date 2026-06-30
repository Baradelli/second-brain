import type { Attachment } from '../../domain/attachment.js';
import type { AttachmentRepository } from '../ports/attachment-repository.js';

export class AttachmentRepositoryFake implements AttachmentRepository {
  private store: Attachment[] = [];

  get saved(): Attachment[] {
    return [...this.store];
  }

  async save(attachment: Attachment): Promise<Attachment> {
    this.store.push({ ...attachment });
    return attachment;
  }

  async listByNote(noteId: string): Promise<Attachment[]> {
    return this.store.filter((a) => a.noteId === noteId);
  }

  async listByCapture(captureId: string): Promise<Attachment[]> {
    return this.store.filter((a) => a.captureId === captureId);
  }
}
