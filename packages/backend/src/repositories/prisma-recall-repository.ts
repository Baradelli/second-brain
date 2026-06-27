import type { PrismaClient, Recall as PrismaRecall } from '@prisma/client';

import type { Recall } from '../domain/recall.js';
import type {
  RecallFilter,
  RecallRepository,
} from '../usecases/ports/recall-repository.js';

function toDomain(record: PrismaRecall): Recall {
  return {
    id: record.id,
    userId: record.userId,
    studyItemId: record.studyItemId,
    confidence: record.confidence as Recall['confidence'],
    note: record.note ?? null,
    occurredAt: record.occurredAt,
    createdAt: record.createdAt,
  };
}

export class PrismaRecallRepository implements RecallRepository {
  constructor(private prisma: PrismaClient) {}

  async save(recall: Recall): Promise<Recall> {
    const record = await this.prisma.recall.create({
      data: {
        id: recall.id,
        userId: recall.userId,
        studyItemId: recall.studyItemId,
        confidence: recall.confidence,
        note: recall.note,
        occurredAt: recall.occurredAt,
        createdAt: recall.createdAt,
      },
    });
    return toDomain(record);
  }

  async byId(id: string): Promise<Recall | null> {
    const record = await this.prisma.recall.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.recall.delete({ where: { id } });
  }

  async find(filter: RecallFilter): Promise<Recall[]> {
    const records = await this.prisma.recall.findMany({
      where: {
        userId: filter.userId,
        ...(filter.studyItemId ? { studyItemId: filter.studyItemId } : {}),
        ...(filter.studyItemIds
          ? { studyItemId: { in: filter.studyItemIds } }
          : {}),
      },
    });
    return records.map(toDomain);
  }
}
