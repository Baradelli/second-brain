import type {
  Label,
  PrismaClient,
  Publication as PrismaPublication,
} from '@prisma/client';

import type { Publication } from '../domain/publication.js';
import type {
  PublicationFilter,
  PublicationRepository,
} from '../usecases/ports/publication-repository.js';

type PublicationWithLabels = PrismaPublication & {
  labels: Pick<Label, 'id'>[];
};

const INCLUDE_LABELS = { labels: { select: { id: true } } } as const;

function toDomain(record: PublicationWithLabels): Publication {
  return {
    id: record.id,
    userId: record.userId,
    sourceType: record.sourceType as Publication['sourceType'],
    sourceId: record.sourceId,
    format: record.format as Publication['format'],
    stage: record.stage as Publication['stage'],
    title: record.title,
    noteId: record.noteId ?? null,
    publishedAt: record.publishedAt ?? null,
    status: record.status as Publication['status'],
    archivedAt: record.archivedAt ?? null,
    createdAt: record.createdAt,
    labelIds: record.labels.map((label) => label.id),
  };
}

export class PrismaPublicationRepository implements PublicationRepository {
  constructor(private prisma: PrismaClient) {}

  async save(publication: Publication): Promise<Publication> {
    const record = await this.prisma.publication.create({
      data: {
        id: publication.id,
        userId: publication.userId,
        sourceType: publication.sourceType,
        sourceId: publication.sourceId,
        format: publication.format,
        stage: publication.stage,
        title: publication.title,
        noteId: publication.noteId,
        publishedAt: publication.publishedAt,
        status: publication.status,
        archivedAt: publication.archivedAt,
        createdAt: publication.createdAt,
        ...(publication.labelIds.length
          ? { labels: { connect: publication.labelIds.map((id) => ({ id })) } }
          : {}),
      },
      include: INCLUDE_LABELS,
    });
    return toDomain(record);
  }

  async byId(id: string): Promise<Publication | null> {
    const record = await this.prisma.publication.findUnique({
      where: { id },
      include: INCLUDE_LABELS,
    });
    return record ? toDomain(record) : null;
  }

  async find(filter: PublicationFilter): Promise<Publication[]> {
    const records = await this.prisma.publication.findMany({
      where: {
        userId: filter.userId,
        ...(filter.stage ? { stage: filter.stage } : {}),
        ...(filter.format ? { format: filter.format } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      include: INCLUDE_LABELS,
    });
    return records.map(toDomain);
  }

  async update(id: string, patch: Partial<Publication>): Promise<Publication> {
    const exists = await this.prisma.publication.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new Error(`Publication not found: ${id}`);

    const { labelIds, ...rest } = patch;

    const record = await this.prisma.publication.update({
      where: { id },
      data: {
        ...(rest.title !== undefined ? { title: rest.title } : {}),
        ...(rest.format !== undefined ? { format: rest.format } : {}),
        ...(rest.stage !== undefined ? { stage: rest.stage } : {}),
        ...(rest.noteId !== undefined ? { noteId: rest.noteId } : {}),
        ...(rest.publishedAt !== undefined
          ? { publishedAt: rest.publishedAt }
          : {}),
        ...(rest.status !== undefined ? { status: rest.status } : {}),
        ...(rest.archivedAt !== undefined
          ? { archivedAt: rest.archivedAt }
          : {}),
        ...(labelIds !== undefined
          ? { labels: { set: labelIds.map((lid) => ({ id: lid })) } }
          : {}),
      },
      include: INCLUDE_LABELS,
    });
    return toDomain(record);
  }
}
