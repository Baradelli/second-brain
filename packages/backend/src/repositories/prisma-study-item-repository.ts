import type {
  Label,
  PrismaClient,
  StudyItem as PrismaStudyItem,
} from '@prisma/client';

import type { StudyItem, StudyQuestions } from '../domain/study-item.js';
import type {
  StudyItemFilter,
  StudyItemRepository,
} from '../usecases/ports/study-item-repository.js';

type StudyItemWithLabels = PrismaStudyItem & { labels: Pick<Label, 'id'>[] };

const INCLUDE_LABELS = { labels: { select: { id: true } } } as const;

function toDomain(record: StudyItemWithLabels): StudyItem {
  return {
    id: record.id,
    userId: record.userId,
    resourceId: record.resourceId ?? null,
    title: record.title,
    reference: record.reference ?? null,
    questions: (record.questions as StudyQuestions | null) ?? null,
    fichamentoNoteId: record.fichamentoNoteId ?? null,
    status: record.status as StudyItem['status'],
    archivedAt: record.archivedAt ?? null,
    createdAt: record.createdAt,
    labelIds: record.labels.map((label) => label.id),
  };
}

export class PrismaStudyItemRepository implements StudyItemRepository {
  constructor(private prisma: PrismaClient) {}

  async save(item: StudyItem): Promise<StudyItem> {
    const record = await this.prisma.studyItem.create({
      data: {
        id: item.id,
        userId: item.userId,
        resourceId: item.resourceId,
        title: item.title,
        reference: item.reference,
        questions: item.questions ?? undefined,
        fichamentoNoteId: item.fichamentoNoteId,
        status: item.status,
        archivedAt: item.archivedAt,
        createdAt: item.createdAt,
        ...(item.labelIds.length
          ? { labels: { connect: item.labelIds.map((id) => ({ id })) } }
          : {}),
      },
      include: INCLUDE_LABELS,
    });
    return toDomain(record);
  }

  async byId(id: string): Promise<StudyItem | null> {
    const record = await this.prisma.studyItem.findUnique({
      where: { id },
      include: INCLUDE_LABELS,
    });
    return record ? toDomain(record) : null;
  }

  async find(filter: StudyItemFilter): Promise<StudyItem[]> {
    const records = await this.prisma.studyItem.findMany({
      where: {
        userId: filter.userId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.resourceId ? { resourceId: filter.resourceId } : {}),
        ...(filter.labelId ? { labels: { some: { id: filter.labelId } } } : {}),
      },
      include: INCLUDE_LABELS,
    });
    return records.map(toDomain);
  }

  async update(id: string, patch: Partial<StudyItem>): Promise<StudyItem> {
    const exists = await this.prisma.studyItem.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new Error(`StudyItem not found: ${id}`);

    const { labelIds, questions, ...rest } = patch;

    const record = await this.prisma.studyItem.update({
      where: { id },
      data: {
        ...(rest.title !== undefined ? { title: rest.title } : {}),
        ...(rest.reference !== undefined ? { reference: rest.reference } : {}),
        ...(rest.resourceId !== undefined
          ? { resourceId: rest.resourceId }
          : {}),
        ...(rest.fichamentoNoteId !== undefined
          ? { fichamentoNoteId: rest.fichamentoNoteId }
          : {}),
        ...(rest.status !== undefined ? { status: rest.status } : {}),
        ...(rest.archivedAt !== undefined
          ? { archivedAt: rest.archivedAt }
          : {}),
        ...(questions !== undefined
          ? { questions: questions ?? undefined }
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
