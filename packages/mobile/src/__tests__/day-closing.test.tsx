import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DayClosingPage } from '../pages/DayClosingPage.js';

vi.mock('@cerebro/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    ...rest
  }: {
    children: React.ReactNode;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
}));

vi.mock('@cerebro/shared/client', () => ({
  getDayClosing: vi.fn(),
  checkGoal: vi.fn(),
  skipGoal: vi.fn(),
}));

import * as endpoints from '@cerebro/shared/client';

function pending(items: { goalId: string; title: string; kind?: string }[]) {
  return {
    date: '2026-06-03',
    pending: items.map((i) => ({
      type: 'HABIT',
      kind: i.kind ?? 'scheduled',
      ...i,
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(endpoints.getDayClosing).mockResolvedValue(pending([]) as never);
});

afterEach(async () => {
  await i18n.changeLanguage('pt');
});

describe('DayClosingPage', () => {
  it('lista os pendentes do dia', async () => {
    vi.mocked(endpoints.getDayClosing).mockResolvedValue(
      pending([{ goalId: 'g1', title: 'Ler' }]) as never,
    );
    render(<DayClosingPage />);
    await waitFor(() => screen.getByText('Ler'));
    expect(screen.getByTestId('day-closing-list')).toBeInTheDocument();
  });

  it('"Fiz" chama checkGoal e remove o item', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.getDayClosing).mockResolvedValue(
      pending([{ goalId: 'g1', title: 'Ler' }]) as never,
    );
    vi.mocked(endpoints.checkGoal).mockResolvedValue({} as never);
    render(<DayClosingPage />);

    await waitFor(() => screen.getByTestId('did-g1'));
    await user.click(screen.getByTestId('did-g1'));

    await waitFor(() => expect(endpoints.checkGoal).toHaveBeenCalledWith('g1'));
    await waitFor(() => expect(screen.queryByText('Ler')).toBeNull());
  });

  it('"Não fiz porque…" exige motivo e chama skipGoal', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.getDayClosing).mockResolvedValue(
      pending([{ goalId: 'g1', title: 'Ler' }]) as never,
    );
    vi.mocked(endpoints.skipGoal).mockResolvedValue({} as never);
    render(<DayClosingPage />);

    await waitFor(() => screen.getByTestId('didnt-g1'));
    await user.click(screen.getByTestId('didnt-g1'));

    // sem motivo, o botão de enviar está desabilitado
    expect(screen.getByTestId('reason-submit-g1')).toBeDisabled();

    await user.type(screen.getByTestId('reason-g1'), 'estava viajando');
    await user.click(screen.getByTestId('reason-submit-g1'));

    await waitFor(() =>
      expect(endpoints.skipGoal).toHaveBeenCalledWith('g1', 'estava viajando'),
    );
  });

  it('"Deixa pra lá" remove o item sem chamar o backend', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.getDayClosing).mockResolvedValue(
      pending([{ goalId: 'g1', title: 'Ler' }]) as never,
    );
    render(<DayClosingPage />);

    await waitFor(() => screen.getByTestId('letgo-g1'));
    await user.click(screen.getByTestId('letgo-g1'));

    await waitFor(() => expect(screen.queryByText('Ler')).toBeNull());
    expect(endpoints.checkGoal).not.toHaveBeenCalled();
    expect(endpoints.skipGoal).not.toHaveBeenCalled();
  });

  it('lista vazia mostra o estado de dia fechado (sem placar)', async () => {
    render(<DayClosingPage />);
    await waitFor(() => screen.getByTestId('day-closed'));
    expect(screen.getByText('Dia fechado')).toBeInTheDocument();
  });
});
