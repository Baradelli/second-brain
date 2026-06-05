export type ResourceType =
  | 'book'
  | 'course'
  | 'video'
  | 'article'
  | 'podcast'
  | 'other';

export type ResourceStage = 'backlog' | 'in_progress' | 'done';

export const RESOURCE_TYPES: readonly ResourceType[] = [
  'book',
  'course',
  'video',
  'article',
  'podcast',
  'other',
];

export const RESOURCE_STAGES: readonly ResourceStage[] = [
  'backlog',
  'in_progress',
  'done',
];

export interface Resource {
  id: string;
  userId: string;
  title: string;
  type: ResourceType;
  url: string | null;
  author: string | null;
  description: string | null;
  stage: ResourceStage;
  status: 'ACTIVE' | 'ARCHIVED';
  archivedAt: Date | null;
  createdAt: Date;
  labelIds: string[]; // vínculo resolvido no repo; no domínio é a lista de ids
}
