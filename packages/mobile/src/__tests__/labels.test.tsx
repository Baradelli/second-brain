import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { forwardRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LabelsPage } from '../pages/LabelsPage.js';

vi.mock('@cerebro/ui', () => ({
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
    {
      label?: string;
      error?: string;
    } & React.InputHTMLAttributes<HTMLInputElement>
  >(({ label, error, ...props }, ref) => (
    <label>
      {label}
      <input aria-label={label} ref={ref} {...props} />
      {error ? <span>{error}</span> : null}
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
  listLabels: vi.fn(),
  createLabel: vi.fn(),
  editLabel: vi.fn(),
  archiveLabel: vi.fn(),
}));

import * as endpoints from '@cerebro/shared/client';

type LabelNodeStub = {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  color: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  archivedAt: string | null;
  createdAt: string;
  children: LabelNodeStub[];
};

function node(
  id: string,
  name: string,
  children: LabelNodeStub[] = [],
): LabelNodeStub {
  return {
    id,
    userId: 'owner',
    name,
    parentId: null,
    color: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    children,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(endpoints.listLabels).mockResolvedValue([]);
});

afterEach(async () => {
  await i18n.changeLanguage('pt');
});

describe('LabelsPage', () => {
  it('renderiza a árvore (pai e filho)', async () => {
    vi.mocked(endpoints.listLabels).mockResolvedValue([
      node('book', 'Livros', [node('tech', 'Técnicos')]) as never,
    ]);
    render(<LabelsPage />);

    await waitFor(() => screen.getByTestId('label-row-book'));
    expect(screen.getByText('Livros')).toBeInTheDocument();
    expect(screen.getByText('Técnicos')).toBeInTheDocument();
  });

  it('cria uma label nova chamando createLabel', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.createLabel).mockResolvedValue({} as never);
    render(<LabelsPage />);
    await waitFor(() => screen.getByTestId('new-label-button'));

    await user.click(screen.getByTestId('new-label-button'));
    await user.type(screen.getByLabelText('Nome'), 'Saúde');
    await user.click(screen.getByTestId('label-color-#22C55E'));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(endpoints.createLabel).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Saúde', color: '#22C55E' }),
      ),
    );
  });

  it('edita uma label chamando editLabel', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listLabels).mockResolvedValue([
      node('book', 'Livros') as never,
    ]);
    vi.mocked(endpoints.editLabel).mockResolvedValue({} as never);
    render(<LabelsPage />);

    await waitFor(() => screen.getByTestId('edit-book'));
    await user.click(screen.getByTestId('edit-book'));
    const nameInput = screen.getByLabelText('Nome');
    await user.clear(nameInput);
    await user.type(nameInput, 'Leituras');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(endpoints.editLabel).toHaveBeenCalledWith(
        'book',
        expect.objectContaining({ name: 'Leituras' }),
      ),
    );
  });

  it('arquiva uma label chamando archiveLabel', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listLabels).mockResolvedValue([
      node('book', 'Livros') as never,
    ]);
    vi.mocked(endpoints.archiveLabel).mockResolvedValue({} as never);
    render(<LabelsPage />);

    await waitFor(() => screen.getByTestId('archive-book'));
    await user.click(screen.getByTestId('archive-book'));

    await waitFor(() =>
      expect(endpoints.archiveLabel).toHaveBeenCalledWith('book'),
    );
  });
});
