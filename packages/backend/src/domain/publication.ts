export type PublicationFormat =
  | 'linkedin'
  | 'substack'
  | 'blog'
  | 'lesson'
  | 'video';

export type PublicationStage = 'idea' | 'draft' | 'published';

export type PublicationSourceType =
  | 'study_item'
  | 'note'
  | 'resource'
  | 'recap';

export const PUBLICATION_FORMATS: readonly PublicationFormat[] = [
  'linkedin',
  'substack',
  'blog',
  'lesson',
  'video',
];

export const PUBLICATION_STAGES: readonly PublicationStage[] = [
  'idea',
  'draft',
  'published',
];

export const PUBLICATION_SOURCE_TYPES: readonly PublicationSourceType[] = [
  'study_item',
  'note',
  'resource',
  'recap',
];

export interface Publication {
  id: string;
  userId: string;
  sourceType: PublicationSourceType;
  sourceId: string;
  format: PublicationFormat;
  stage: PublicationStage;
  title: string;
  noteId: string | null;
  publishedAt: Date | null;
  status: 'ACTIVE' | 'ARCHIVED';
  archivedAt: Date | null;
  createdAt: Date;
  labelIds: string[]; // vínculo resolvido no repo; no domínio é a lista de ids
}
