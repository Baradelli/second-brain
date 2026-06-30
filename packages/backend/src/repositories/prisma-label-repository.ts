import type { Label as PrismaLabel, PrismaClient } from '@prisma/client';

import type { Label } from '../domain/label.js';
import type {
  LabelRepository,
  LabelUsage,
} from '../usecases/ports/label-repository.js';

function toDomain(record: PrismaLabel): Label {
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    parentId: record.parentId,
    color: record.color,
    status: record.status as Label['status'],
    archivedAt: record.archivedAt,
    createdAt: record.createdAt,
  };
}

export class PrismaLabelRepository implements LabelRepository {
  constructor(private prisma: PrismaClient) {}

  async save(label: Label): Promise<Label> {
    const record = await this.prisma.label.create({
      data: {
        id: label.id,
        userId: label.userId,
        name: label.name,
        parentId: label.parentId,
        color: label.color,
        status: label.status,
        archivedAt: label.archivedAt,
        createdAt: label.createdAt,
      },
    });
    return toDomain(record);
  }

  async byId(id: string): Promise<Label | null> {
    const record = await this.prisma.label.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async listByUser(
    userId: string,
    status?: 'ACTIVE' | 'ARCHIVED',
  ): Promise<Label[]> {
    const records = await this.prisma.label.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    return records.map(toDomain);
  }

  async update(id: string, patch: Partial<Label>): Promise<Label> {
    const exists = await this.prisma.label.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new Error(`Label not found: ${id}`);

    const record = await this.prisma.label.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.parentId !== undefined ? { parentId: patch.parentId } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.archivedAt !== undefined
          ? { archivedAt: patch.archivedAt }
          : {}),
      },
    });
    return toDomain(record);
  }

  async delete(id: string): Promise<void> {
    // GuideQuestion.labelId é FK obrigatória (Restrict); as perguntas-guia são
    // derivadas da label, então removemos junto, numa transação atômica.
    await this.prisma.$transaction([
      this.prisma.guideQuestion.deleteMany({ where: { labelId: id } }),
      this.prisma.label.delete({ where: { id } }),
    ]);
  }

  async usageCount(labelId: string): Promise<LabelUsage> {
    const label = await this.prisma.label.findUnique({
      where: { id: labelId },
      select: {
        _count: { select: { captures: true, notes: true } },
      },
    });

    const activeChildren = await this.prisma.label.count({
      where: { parentId: labelId, status: 'ACTIVE' },
    });

    return {
      items: (label?._count.captures ?? 0) + (label?._count.notes ?? 0),
      activeChildren,
    };
  }
}
