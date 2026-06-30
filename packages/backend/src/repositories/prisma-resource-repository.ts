import type {
  Label,
  PrismaClient,
  Resource as PrismaResource,
} from '@prisma/client';

import type { Resource } from '../domain/resource.js';
import type {
  ResourceFilter,
  ResourceRepository,
} from '../usecases/ports/resource-repository.js';

type ResourceWithLabels = PrismaResource & { labels: Pick<Label, 'id'>[] };

const INCLUDE_LABELS = { labels: { select: { id: true } } } as const;

function toDomain(record: ResourceWithLabels): Resource {
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    type: record.type as Resource['type'],
    url: record.url ?? null,
    author: record.author ?? null,
    description: record.description ?? null,
    stage: record.stage as Resource['stage'],
    status: record.status as Resource['status'],
    archivedAt: record.archivedAt ?? null,
    createdAt: record.createdAt,
    labelIds: record.labels.map((label) => label.id),
  };
}

export class PrismaResourceRepository implements ResourceRepository {
  constructor(private prisma: PrismaClient) {}

  async save(resource: Resource): Promise<Resource> {
    const record = await this.prisma.resource.create({
      data: {
        id: resource.id,
        userId: resource.userId,
        title: resource.title,
        type: resource.type,
        url: resource.url,
        author: resource.author,
        description: resource.description,
        stage: resource.stage,
        status: resource.status,
        archivedAt: resource.archivedAt,
        createdAt: resource.createdAt,
        ...(resource.labelIds.length
          ? { labels: { connect: resource.labelIds.map((id) => ({ id })) } }
          : {}),
      },
      include: INCLUDE_LABELS,
    });
    return toDomain(record);
  }

  async byId(id: string): Promise<Resource | null> {
    const record = await this.prisma.resource.findUnique({
      where: { id },
      include: INCLUDE_LABELS,
    });
    return record ? toDomain(record) : null;
  }

  async find(filter: ResourceFilter): Promise<Resource[]> {
    const records = await this.prisma.resource.findMany({
      where: {
        userId: filter.userId,
        ...(filter.stage ? { stage: filter.stage } : {}),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.labelId ? { labels: { some: { id: filter.labelId } } } : {}),
      },
      include: INCLUDE_LABELS,
    });
    return records.map(toDomain);
  }

  async update(id: string, patch: Partial<Resource>): Promise<Resource> {
    const exists = await this.prisma.resource.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new Error(`Resource not found: ${id}`);

    const { labelIds, ...rest } = patch;

    const record = await this.prisma.resource.update({
      where: { id },
      data: {
        ...(rest.title !== undefined ? { title: rest.title } : {}),
        ...(rest.type !== undefined ? { type: rest.type } : {}),
        ...(rest.url !== undefined ? { url: rest.url } : {}),
        ...(rest.author !== undefined ? { author: rest.author } : {}),
        ...(rest.description !== undefined
          ? { description: rest.description }
          : {}),
        ...(rest.stage !== undefined ? { stage: rest.stage } : {}),
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

  async delete(id: string): Promise<void> {
    // O usecase já bloqueia se há notas/itens de estudo apontando para o recurso.
    await this.prisma.resource.delete({ where: { id } });
  }
}
