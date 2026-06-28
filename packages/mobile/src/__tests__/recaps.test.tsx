import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RecapsPage } from '../pages/RecapsPage.js';

vi.mock('@cerebro/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyState: ({ title }: { title: string }) => <p>{title}</p>,
  BottomSheet: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div role="dialog">{children}</div> : null),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@cerebro/shared/client', () => ({
  listNotes: vi.fn(),
  createRecap: vi.fn(),
}));

import * as endpoints from '@cerebro/shared/client';

function recap(id: string, scope: string, type = 'REFLECTION') {
  return {
    id,
    userId: 'owner',
    type,
    scope,
    date: '2026-06-01T00:00:00.000Z',
    doc: {},
    plainText: '',
    status: 'ACTIVE',
    createdAt: '2026-06-01T00:00:00.000Z',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // WEEK, MONTH, YEAR em ordem
  vi.mocked(endpoints.listNotes)
    .mockResolvedValueOnce([recap('w1', 'WEEK') as never])
    .mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([] as never);
});

afterEach(async () => {
  await i18n.changeLanguage('pt');
});

describe('RecapsPage', () => {
  it('lista os recaps existentes por período', async () => {
    render(<RecapsPage />);
    await waitFor(() => screen.getByTestId('recap-w1'));
  });

  it('cria um recap escolhendo o tipo e abre no editor', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.createRecap).mockResolvedValue(
      recap('new-1', 'MONTH', 'DEVOTIONAL') as never,
    );
    render(<RecapsPage />);

    await waitFor(() => screen.getByTestId('recap-new-MONTH'));
    await user.click(screen.getByTestId('recap-new-MONTH'));
    await user.click(await screen.findByTestId('recap-create-devotional'));

    await waitFor(() =>
      expect(endpoints.createRecap).toHaveBeenCalledWith('DEVOTIONAL', 'MONTH'),
    );
    expect(mockNavigate).toHaveBeenCalledWith('/editor/new-1');
  });
});
