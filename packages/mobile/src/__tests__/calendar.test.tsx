import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CalendarPage } from '../pages/CalendarPage.js';

vi.mock('@cerebro/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@cerebro/shared/client', () => ({
  getCalendar: vi.fn(),
}));

import * as endpoints from '@cerebro/shared/client';

function makeMonth(month: string, days: Partial<MonthDay>[] = []) {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const total = new Date(y, m, 0).getDate();
  const byDate = new Map(days.map((d) => [d.date, d] as const));
  return {
    month,
    days: Array.from({ length: total }, (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, '0')}`;
      const override = byDate.get(date);
      return {
        date,
        goalsPlanned: override?.goalsPlanned ?? 0,
        goalsDone: override?.goalsDone ?? 0,
        journal: override?.journal ?? { devotional: false, reflection: false },
      };
    }),
  };
}

interface MonthDay {
  date: string;
  goalsPlanned: number;
  goalsDone: number;
  journal: { devotional: boolean; reflection: boolean };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(endpoints.getCalendar).mockResolvedValue(
    makeMonth('2026-06', [
      {
        date: '2026-06-03',
        goalsPlanned: 2,
        goalsDone: 1,
        journal: { devotional: true, reflection: false },
      },
    ]) as never,
  );
});

afterEach(async () => {
  await i18n.changeLanguage('pt');
});

describe('CalendarPage', () => {
  it('renders the month grid from the aggregator', async () => {
    render(<CalendarPage />);
    await waitFor(() => screen.getByTestId('calendar-day-2026-06-03'));
    // 30 dias em junho
    expect(screen.getByTestId('calendar-day-2026-06-30')).toBeInTheDocument();
    // marcador metas cumpridas/previstas
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('navigates to the day detail when a day is tapped', async () => {
    const user = userEvent.setup();
    render(<CalendarPage />);

    await waitFor(() => screen.getByTestId('calendar-day-2026-06-03'));
    await user.click(screen.getByTestId('calendar-day-2026-06-03'));

    expect(mockNavigate).toHaveBeenCalledWith('/calendar/2026-06-03');
  });

  it('navigates to the previous and next month', async () => {
    // A página inicia no mês corrente local; computamos o esperado do mesmo jeito.
    const now = new Date();
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const user = userEvent.setup();
    render(<CalendarPage />);

    await waitFor(() => screen.getByTestId('calendar-day-2026-06-03'));
    vi.mocked(endpoints.getCalendar).mockClear();

    await user.click(screen.getByTestId('calendar-prev'));
    await waitFor(() =>
      expect(endpoints.getCalendar).toHaveBeenCalledWith(prev),
    );

    await user.click(screen.getByTestId('calendar-next'));
    await waitFor(() =>
      expect(endpoints.getCalendar).toHaveBeenCalledWith(cur),
    );
  });

  it('shows an error message when loading fails', async () => {
    vi.mocked(endpoints.getCalendar).mockRejectedValue(new Error('boom'));
    render(<CalendarPage />);
    await waitFor(() =>
      screen.getByText('Não foi possível carregar o calendário'),
    );
  });
});
