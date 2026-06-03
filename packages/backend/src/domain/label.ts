export interface Label {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  color: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  archivedAt: Date | null;
  createdAt: Date;
}

export interface LabelNode extends Label {
  children: LabelNode[];
}
