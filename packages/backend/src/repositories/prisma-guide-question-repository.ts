import type {
  GuideQuestion as PrismaGuideQuestion,
  Label,
  PrismaClient,
} from '@prisma/client';

import type {
  GuideQuestion,
  GuideQuestionLabel,
} from '../domain/guide-question.js';
import type {
  GuideQuestionRepository,
  GuideQuestionWithLabel,
} from '../usecases/ports/guide-question-repository.js';

function toDomain(record: PrismaGuideQuestion): GuideQuestion {
  return {
    id: record.id,
    labelId: record.labelId,
    text: record.text,
    order: record.order,
    active: record.active,
  };
}

function labelToDomain(
  record: Pick<Label, 'id' | 'userId' | 'name'>,
): GuideQuestionLabel {
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
  };
}

export class PrismaGuideQuestionRepository implements GuideQuestionRepository {
  constructor(private prisma: PrismaClient) {}

  async labelById(id: string): Promise<GuideQuestionLabel | null> {
    const record = await this.prisma.label.findUnique({
      where: { id },
      select: { id: true, userId: true, name: true },
    });
    return record ? labelToDomain(record) : null;
  }

  async save(question: GuideQuestion): Promise<GuideQuestion> {
    const record = await this.prisma.guideQuestion.create({
      data: {
        id: question.id,
        labelId: question.labelId,
        text: question.text,
        order: question.order,
        active: question.active,
      },
    });
    return toDomain(record);
  }

  async byId(id: string): Promise<GuideQuestion | null> {
    const record = await this.prisma.guideQuestion.findUnique({
      where: { id },
    });
    return record ? toDomain(record) : null;
  }

  async update(
    id: string,
    patch: Partial<GuideQuestion>,
  ): Promise<GuideQuestion> {
    const exists = await this.prisma.guideQuestion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new Error(`GuideQuestion not found: ${id}`);

    const record = await this.prisma.guideQuestion.update({
      where: { id },
      data: {
        ...(patch.text !== undefined ? { text: patch.text } : {}),
        ...(patch.order !== undefined ? { order: patch.order } : {}),
        ...(patch.active !== undefined ? { active: patch.active } : {}),
      },
    });
    return toDomain(record);
  }

  async findActiveByLabelIds(
    labelIds: string[],
  ): Promise<GuideQuestionWithLabel[]> {
    if (labelIds.length === 0) return [];

    const records = await this.prisma.guideQuestion.findMany({
      where: { labelId: { in: labelIds }, active: true },
      include: { label: { select: { id: true, userId: true, name: true } } },
      orderBy: [{ labelId: 'asc' }, { order: 'asc' }],
    });

    return records.map((record) => ({
      label: labelToDomain(record.label),
      question: toDomain(record),
    }));
  }
}
