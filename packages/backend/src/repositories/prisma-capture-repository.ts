import type { PrismaClient, Capture as PrismaCapture, Label } from '@prisma/client';
import type { Capture } from '../domain/capture.js';
import type { CaptureFilter, CaptureRepository } from '../usecases/ports/capture-repository.js';

type CaptureWithLabels = PrismaCapture & { labels: Pick<Label, 'id'>[] };

function toDomain(record: CaptureWithLabels): Capture {
  return {
    id: record.id,
    userId: record.userId,
    text: record.text,
    url: record.url ?? undefined,
    status: record.status as Capture['status'],
    reviewAt: record.reviewAt,
    processedAt: record.processedAt,
    promotedToType: record.promotedToType,
    promotedToId: record.promotedToId,
    archivedAt: record.archivedAt,
    archiveReason: record.archiveReason,
    labelIds: record.labels.map((l) => l.id),
    createdAt: record.createdAt,
  };
}

const INCLUDE_LABELS = { labels: { select: { id: true } } } as const;

export class PrismaCaptureRepository implements CaptureRepository {
  constructor(private prisma: PrismaClient) {}

  async save(capture: Capture): Promise<Capture> {
    const record = await this.prisma.capture.create({
      data: {
        id: capture.id,
        userId: capture.userId,
        text: capture.text,
        url: capture.url,
        status: capture.status,
        reviewAt: capture.reviewAt,
        processedAt: capture.processedAt,
        promotedToType: capture.promotedToType,
        promotedToId: capture.promotedToId,
        archivedAt: capture.archivedAt,
        archiveReason: capture.archiveReason,
        createdAt: capture.createdAt,
        ...(capture.labelIds?.length
          ? { labels: { connect: capture.labelIds.map((id) => ({ id })) } }
          : {}),
      },
      include: INCLUDE_LABELS,
    });
    return toDomain(record);
  }

  async byId(id: string): Promise<Capture | null> {
    const record = await this.prisma.capture.findUnique({
      where: { id },
      include: INCLUDE_LABELS,
    });
    return record ? toDomain(record) : null;
  }

  async find(filter: CaptureFilter): Promise<Capture[]> {
    const records = await this.prisma.capture.findMany({
      where: {
        userId: filter.userId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.reviewUntil
          ? { reviewAt: { lte: filter.reviewUntil } }
          : {}),
      },
      include: INCLUDE_LABELS,
    });
    return records.map(toDomain);
  }

  async update(id: string, patch: Partial<Capture>): Promise<Capture> {
    const exists = await this.prisma.capture.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new Error(`Capture not found: ${id}`);

    const { labelIds, ...rest } = patch;

    const record = await this.prisma.capture.update({
      where: { id },
      data: {
        ...(rest.text        !== undefined ? { text: rest.text }               : {}),
        ...(rest.url         !== undefined ? { url: rest.url }                 : {}),
        ...(rest.status      !== undefined ? { status: rest.status }           : {}),
        ...(rest.reviewAt    !== undefined ? { reviewAt: rest.reviewAt }       : {}),
        ...(rest.processedAt !== undefined ? { processedAt: rest.processedAt } : {}),
        ...(rest.promotedToType !== undefined ? { promotedToType: rest.promotedToType } : {}),
        ...(rest.promotedToId   !== undefined ? { promotedToId: rest.promotedToId }     : {}),
        ...(rest.archivedAt  !== undefined ? { archivedAt: rest.archivedAt }   : {}),
        ...(rest.archiveReason !== undefined ? { archiveReason: rest.archiveReason } : {}),
        ...(labelIds !== undefined
          ? { labels: { set: labelIds.map((lid) => ({ id: lid })) } }
          : {}),
      },
      include: INCLUDE_LABELS,
    });
    return toDomain(record);
  }
}
