export type GoalType = 'HABIT' | 'TARGET' | 'PROJECT' | 'UMBRELLA';
export type GoalPeriod = 'day' | 'week' | 'month';

export const GOAL_TYPES: readonly GoalType[] = [
  'HABIT',
  'TARGET',
  'PROJECT',
  'UMBRELLA',
];
export const GOAL_PERIODS: readonly GoalPeriod[] = ['day', 'week', 'month'];

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  type: GoalType;
  parentId: string | null;
  resourceId?: string | null; // objetivo de leitura: aponta para um Resource
  targetValue: number | null; // TARGET/PROJECT
  unit: string | null;
  period: GoalPeriod | null; // cadência "Nx por período" (HABIT)
  timesPerPeriod: number | null;
  weekdays: number[]; // 0=domingo..6=sábado (HABIT, dias fixos)
  startAt: Date | null;
  dueAt: Date | null;
  completedAt: Date | null; // UMBRELLA preenchido na mão (Tarefa 31)
  status: 'ACTIVE' | 'ARCHIVED';
  archivedAt: Date | null;
  createdAt: Date;
  labelIds: string[];
}
