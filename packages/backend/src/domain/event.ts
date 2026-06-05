export type EventType = 'done' | 'skip';

export interface Event {
  id: string;
  userId: string;
  goalId: string;
  type: EventType;
  value: number | null; // TARGET/PROJECT: quanto somou neste check (done). skip: null
  reason: string | null; // obrigatório quando type='skip'. done: null
  occurredAt: Date; // instante UTC
  createdAt: Date;
}
