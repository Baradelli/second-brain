import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../lib/i18n/index.js';
import { SearchPage } from '../pages/SearchPage.js';

vi.mock('@cerebro/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyState: ({ title }: { title: string }) => <p>{title}</p>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../lib/api/endpoints.js', () => ({
  getSearch: vi.fn(),
}));

import * as endpoints from '../lib/api/endpoints.js';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(endpoints.getSearch).mockResolvedValue({
    notes: [
      {
        id: 'n1',
        userId: 'owner',
        type: 'NOTE',
        scope: 'DAY',
        date: '2026-06-03T00:00:00.000Z',
        doc: {},
        plainText: 'sobre clareza mental',
        status: 'ACTIVE',
        createdAt: '2026-06-03T00:00:00.000Z',
      },
    ],
    resources: [],
    captures: [],
  } as never);
});

afterEach(async () => {
  await i18n.changeLanguage('pt');
});

describe('SearchPage', () => {
  it('mostra a dica antes de digitar', () => {
    render(<SearchPage />);
    expect(screen.getByText('Digite para buscar.')).toBeInTheDocument();
    expect(endpoints.getSearch).not.toHaveBeenCalled();
  });

  it('busca ao digitar e mostra os resultados; tocar navega', async () => {
    const user = userEvent.setup();
    render(<SearchPage />);

    await user.type(screen.getByTestId('search-input'), 'clareza');

    await waitFor(() =>
      expect(endpoints.getSearch).toHaveBeenCalledWith('clareza'),
    );
    await waitFor(() => screen.getByText('sobre clareza mental'));

    await user.click(screen.getByTestId('search-note-n1'));
    expect(mockNavigate).toHaveBeenCalledWith('/editor/n1');
  });

  it('mostra "nada encontrado" quando não há resultados', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.getSearch).mockResolvedValue({
      notes: [],
      resources: [],
      captures: [],
    } as never);
    render(<SearchPage />);

    await user.type(screen.getByTestId('search-input'), 'zzz');
    await waitFor(() => screen.getByText('Nada encontrado.'));
  });
});
