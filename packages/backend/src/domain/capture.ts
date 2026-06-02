export interface Capture {
  id: string;
  userId: string;
  text: string;
  url?: string;
  status: 'PENDING' | 'PROCESSED' | 'ARCHIVED';
  reviewAt: Date | null;
  processedAt: Date | null;
  promotedToType: string | null;
  promotedToId: string | null;
  archivedAt: Date | null;
  archiveReason: string | null;
  labelIds?: string[];
  createdAt: Date;
}
