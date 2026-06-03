export interface Attachment {
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
}
