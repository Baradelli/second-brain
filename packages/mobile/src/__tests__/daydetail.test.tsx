import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DayDetailPage } from '../pages/DayDetailPage.js';

vi.mock('@cerebro/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyState: ({ title }: { title: string }) => <p>{title}</p>,
  Button: ({
    children,
    ...rest
  }: {
    children: React.ReactNode;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ date: '2026-06-03' }),
}));

vi.mock('@cerebro/shared/client', () => ({
  getDayDetail: vi.fn(),
}));

import * as endpoints from '@cerebro/shared/client';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(endpoints.getDayDetail).mockResolvedValue({
    date: '2026-06-03',
    goals: [
      { goalId: 'g1', title: 'Ler', kind: 'scheduled', status: 'done' },
      { goalId: 'g2', title: 'Correr', kind: 'scheduled', status: 'pending' },
    ],
    notes: [{ id: 'n1', type: 'REFLECTION', title: 'Diário da noite' }],
  } as never);
});

afterEach(async () => {
  await i18n.changeLanguage('pt');
});

describe('DayDetailPage', () => {
  it('renders goals with status and the notes of the day', async () => {
    render(<DayDetailPage />);

    await waitFor(() => screen.getByText('Ler'));
    expect(screen.getByText('Correr')).toBeInTheDocument();
    expect(screen.getByTestId('goal-status-done')).toBeInTheDocument();
    expect(screen.getByTestId('goal-status-pending')).toBeInTheDocument();
    expect(screen.getByText('Diário da noite')).toBeInTheDocument();
  });

  it('opens a note in the editor when tapped', async () => {
    const user = userEvent.setup();
    render(<DayDetailPage />);

    await waitFor(() => screen.getByTestId('day-note-n1'));
    await user.click(screen.getByTestId('day-note-n1'));

    expect(mockNavigate).toHaveBeenCalledWith('/editor/n1');
  });

  it('shows an error message when loading fails', async () => {
    vi.mocked(endpoints.getDayDetail).mockRejectedValue(new Error('boom'));
    render(<DayDetailPage />);
    await waitFor(() =>
      screen.getByText('Não foi possível carregar o calendário'),
    );
  });
});
