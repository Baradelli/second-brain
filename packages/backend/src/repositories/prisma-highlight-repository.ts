import type {
  Highlight as PrismaHighlight,
  PrismaClient,
} from '@prisma/client';

import type { Highlight } from '../domain/highlight.js';
import type {
  HighlightFilter,
  HighlightRepository,
} from '../usecases/ports/highlight-repository.js';

function toDomain(record: PrismaHighlight): Highlight {
  return {
    id: record.id,
    userId: record.userId,
    resourceId: record.resourceId,
    colorId: record.colorId,
    location: record.location ?? null,
    quote: record.quote,
    comment: record.comment ?? null,
    status: record.status as Highlight['status'],
    archivedAt: record.archivedAt ?? null,
    createdAt: record.createdAt,
  };
}

export class PrismaHighlightRepository implements HighlightRepository {
  constructor(private prisma: PrismaClient) {}

  async save(highlight: Highlight): Promise<Highlight> {
    const record = await this.prisma.highlight.create({
      data: {
        id: highlight.id,
        userId: highlight.userId,
        resourceId: highlight.resourceId,
        colorId: highlight.colorId,
        location: highlight.location,
        quote: highlight.quote,
        comment: highlight.comment,
        status: highlight.status,
        archivedAt: highlight.archivedAt,
        createdAt: highlight.createdAt,
      },
    });
    return toDomain(record);
  }

  async byId(id: string): Promise<Highlight | null> {
    const record = await this.prisma.highlight.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async find(filter: HighlightFilter): Promise<Highlight[]> {
    const records = await this.prisma.highlight.findMany({
      where: {
        userId: filter.userId,
        ...(filter.resourceId ? { resourceId: filter.resourceId } : {}),
        ...(filter.colorId ? { colorId: filter.colorId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
    });
    return records.map(toDomain);
  }

  async update(id: string, patch: Partial<Highlight>): Promise<Highlight> {
    const exists = await this.prisma.highlight.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new Error(`Highlight not found: ${id}`);

    const record = await this.prisma.highlight.update({
      where: { id },
      data: {
        ...(patch.colorId !== undefined ? { colorId: patch.colorId } : {}),
        ...(patch.location !== undefined ? { location: patch.location } : {}),
        ...(patch.quote !== undefined ? { quote: patch.quote } : {}),
        ...(patch.comment !== undefined ? { comment: patch.comment } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.archivedAt !== undefined
          ? { archivedAt: patch.archivedAt }
          : {}),
      },
    });
    return toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.highlight.delete({ where: { id } });
  }

  async countByColor(userId: string, colorId: string): Promise<number> {
    return this.prisma.highlight.count({
      where: { userId, colorId, status: 'ACTIVE' },
    });
  }
}
