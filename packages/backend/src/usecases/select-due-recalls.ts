import { computeRecallSchedule } from '../domain/recall-schedule.js';
import type { RecallRepository } from './ports/recall-repository.js';
import type { StudyItemRepository } from './ports/study-item-repository.js';

export interface SelectDueRecallsInput {
  userId: string;
  reference: Date;
  timezone: string;
}

export interface DueRecallItem {
  studyItemId: string;
  title: string;
  dueToday: boolean; // sempre true na lista retornada (filtramos por isso)
  overdue: boolean;
  nextRecallAt: Date | null;
}

export class SelectDueRecalls {
  constructor(
    private items: StudyItemRepository,
    private recalls: RecallRepository,
  ) {}

  async execute(input: SelectDueRecallsInput): Promise<DueRecallItem[]> {
    const items = await this.items.find({
      userId: input.userId,
      status: 'ACTIVE',
    });

    const due: DueRecallItem[] = [];
    for (const item of items) {
      const recalls = await this.recalls.find({
        userId: input.userId,
        studyItemId: item.id,
      });
      const schedule = computeRecallSchedule({
        createdAt: item.createdAt,
        recalls,
        timezone: input.timezone,
        reference: input.reference,
      });
      if (schedule.dueToday) {
        due.push({
          studyItemId: item.id,
          title: item.title,
          dueToday: true,
          overdue: schedule.overdue,
          nextRecallAt: schedule.nextRecallAt,
        });
      }
    }
    return due;
  }
}
