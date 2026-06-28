import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { forwardRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@cerebro/shared/client', () => ({
  listActiveGoals: vi.fn(),
  createGoal: vi.fn(),
  getGoalProgress: vi.fn(),
  checkGoal: vi.fn(),
  completeGoal: vi.fn(),
  editGoal: vi.fn(),
  archiveGoal: vi.fn(),
  unarchiveGoal: vi.fn(),
  deleteGoal: vi.fn(),
  listArchivedGoals: vi.fn(),
  undoCheck: vi.fn(),
}));

import * as endpoints from '@cerebro/shared/client';

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
    doneToday: false,
    todayEventId: null,
    ...overrides,
  };
}

function makeArchived(overrides: Record<string, unknown> = {}) {
  return {
    ...makeGoal({ status: 'ARCHIVED', archivedAt: '2026-06-01T00:00:00.000Z' }),
    deletable: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(endpoints.listActiveGoals).mockResolvedValue([]);
  vi.mocked(endpoints.getGoalProgress).mockResolvedValue(
    makeProgress() as never,
  );
  vi.mocked(endpoints.listArchivedGoals).mockResolvedValue([]);
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

  it('desmarca um HABIT já feito hoje (clicar de novo desfaz)', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listActiveGoals).mockResolvedValue([
      makeGoal() as never,
    ]);
    vi.mocked(endpoints.getGoalProgress).mockResolvedValue(
      makeProgress({ doneToday: true, todayEventId: 'ev-9' }) as never,
    );
    vi.mocked(endpoints.undoCheck).mockResolvedValue(undefined as never);
    render(<GoalsPage />);

    await waitFor(() => screen.getByTestId('goal-action-g-1'));
    await user.click(screen.getByTestId('goal-action-g-1'));

    await waitFor(() =>
      expect(endpoints.undoCheck).toHaveBeenCalledWith('ev-9'),
    );
    expect(endpoints.checkGoal).not.toHaveBeenCalled();
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

  it('edita um objetivo ao tocar no card (sem enviar type)', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listActiveGoals).mockResolvedValue([
      makeGoal() as never,
    ]);
    vi.mocked(endpoints.editGoal).mockResolvedValue(makeGoal() as never);
    render(<GoalsPage />);

    await waitFor(() => screen.getByTestId('goal-edit-g-1'));
    await user.click(screen.getByTestId('goal-edit-g-1'));

    const input = await screen.findByLabelText('Título');
    expect(input).toHaveValue('Ler todo dia'); // preenchido
    await user.clear(input);
    await user.type(input, 'Ler à noite');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(endpoints.editGoal).toHaveBeenCalled());
    const [id, body] = vi.mocked(endpoints.editGoal).mock.calls[0]!;
    expect(id).toBe('g-1');
    expect(body).toMatchObject({ title: 'Ler à noite' });
    expect(body).not.toHaveProperty('type');
  });

  it('arquiva um objetivo pela tela de edição', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listActiveGoals).mockResolvedValue([
      makeGoal() as never,
    ]);
    vi.mocked(endpoints.archiveGoal).mockResolvedValue(makeGoal() as never);
    render(<GoalsPage />);

    await waitFor(() => screen.getByTestId('goal-edit-g-1'));
    await user.click(screen.getByTestId('goal-edit-g-1'));
    await user.click(await screen.findByTestId('archive-goal'));

    await waitFor(() =>
      expect(endpoints.archiveGoal).toHaveBeenCalledWith('g-1'),
    );
  });

  it('lista e restaura objetivos arquivados', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listArchivedGoals).mockResolvedValue([
      makeArchived() as never,
    ]);
    vi.mocked(endpoints.unarchiveGoal).mockResolvedValue(makeGoal() as never);
    render(<GoalsPage />);

    await waitFor(() => screen.getByTestId('toggle-archived'));
    await user.click(screen.getByTestId('toggle-archived'));

    await user.click(await screen.findByTestId('restore-goal-g-1'));
    await waitFor(() =>
      expect(endpoints.unarchiveGoal).toHaveBeenCalledWith('g-1'),
    );
  });

  it('exclui um arquivado elegível com confirmação', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listArchivedGoals).mockResolvedValue([
      makeArchived({ deletable: true }) as never,
    ]);
    vi.mocked(endpoints.deleteGoal).mockResolvedValue(makeGoal() as never);
    render(<GoalsPage />);

    await waitFor(() => screen.getByTestId('toggle-archived'));
    await user.click(screen.getByTestId('toggle-archived'));

    await user.click(await screen.findByTestId('delete-goal-g-1'));
    await user.click(await screen.findByTestId('confirm-delete'));

    await waitFor(() =>
      expect(endpoints.deleteGoal).toHaveBeenCalledWith('g-1'),
    );
  });

  it('não mostra excluir para arquivado não elegível', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listArchivedGoals).mockResolvedValue([
      makeArchived({ deletable: false }) as never,
    ]);
    render(<GoalsPage />);

    await waitFor(() => screen.getByTestId('toggle-archived'));
    await user.click(screen.getByTestId('toggle-archived'));

    await screen.findByTestId('restore-goal-g-1');
    expect(screen.queryByTestId('delete-goal-g-1')).not.toBeInTheDocument();
  });
});
