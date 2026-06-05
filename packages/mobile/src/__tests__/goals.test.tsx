import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../lib/i18n/index.js';
import { GoalsPage } from '../pages/GoalsPage.js';

vi.mock('@cerebro/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Chip: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  EmptyState: ({ title }: { title: string }) => <p>{title}</p>,
  ProgressRing: ({ value }: { value: number }) => <div>{value}%</div>,
  Button: ({
    children,
    ...rest
  }: {
    children: React.ReactNode;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
  Input: forwardRef<
    HTMLInputElement,
    { label?: string } & React.InputHTMLAttributes<HTMLInputElement>
  >(({ label, ...props }, ref) => (
    <label>
      {label}
      <input aria-label={label} ref={ref} {...props} />
    </label>
  )),
  BottomSheet: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
}));

vi.mock('../lib/api/endpoints.js', () => ({
  listActiveGoals: vi.fn(),
  createGoal: vi.fn(),
  getGoalProgress: vi.fn(),
  checkGoal: vi.fn(),
  completeGoal: vi.fn(),
}));

import * as endpoints from '../lib/api/endpoints.js';

function makeGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'g-1',
    userId: 'owner',
    title: 'Ler todo dia',
    description: null,
    type: 'HABIT',
    parentId: null,
    targetValue: null,
    unit: null,
    period: null,
    timesPerPeriod: null,
    weekdays: [1, 3, 5],
    startAt: null,
    dueAt: null,
    completedAt: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    labelIds: [],
    ...overrides,
  };
}

function makeProgress(overrides: Record<string, unknown> = {}) {
  return {
    goalId: 'g-1',
    type: 'HABIT',
    done: 2,
    target: 3,
    ratio: 0.67,
    period: null,
    completed: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(endpoints.listActiveGoals).mockResolvedValue([]);
  vi.mocked(endpoints.getGoalProgress).mockResolvedValue(
    makeProgress() as never,
  );
});

afterEach(async () => {
  await i18n.changeLanguage('pt');
});

describe('GoalsPage', () => {
  it('lista objetivos ativos com progresso', async () => {
    vi.mocked(endpoints.listActiveGoals).mockResolvedValue([
      makeGoal() as never,
    ]);
    render(<GoalsPage />);

    await waitFor(() => screen.getByText('Ler todo dia'));
    expect(screen.getByText('67%')).toBeInTheDocument();
  });

  it('estado vazio quando não há objetivos', async () => {
    render(<GoalsPage />);
    await waitFor(() => screen.getByText('Nenhum objetivo ativo ainda'));
  });

  it('check de HABIT chama checkGoal e recarrega', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listActiveGoals).mockResolvedValue([
      makeGoal() as never,
    ]);
    vi.mocked(endpoints.checkGoal).mockResolvedValue({} as never);
    render(<GoalsPage />);

    await waitFor(() => screen.getByTestId('goal-action-g-1'));
    await user.click(screen.getByTestId('goal-action-g-1'));

    await waitFor(() =>
      expect(endpoints.checkGoal).toHaveBeenCalledWith('g-1'),
    );
  });

  it('cria um objetivo HABIT com weekdays', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.createGoal).mockResolvedValue(makeGoal() as never);
    render(<GoalsPage />);

    await waitFor(() => screen.getByTestId('new-goal-button'));
    await user.click(screen.getByTestId('new-goal-button'));
    await user.type(screen.getByLabelText('Título'), 'Meditar');
    await user.click(screen.getByTestId('weekday-1'));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(endpoints.createGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Meditar',
          type: 'HABIT',
          weekdays: [1],
        }),
      ),
    );
  });
});
