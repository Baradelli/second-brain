import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../lib/i18n/index.js';
import { LibraryPage } from '../pages/LibraryPage.js';

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

vi.mock('../lib/api/endpoints.js', () => ({
  listResources: vi.fn(),
  createResource: vi.fn(),
  editResource: vi.fn(),
  listLabels: vi.fn(),
}));

import * as endpoints from '../lib/api/endpoints.js';

function makeResource(overrides: Record<string, unknown> = {}) {
  return {
    id: 'res-1',
    userId: 'owner',
    title: 'Domain-Driven Design',
    type: 'book',
    url: null,
    author: 'Evans',
    description: null,
    stage: 'backlog',
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    labelIds: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(endpoints.listResources).mockResolvedValue([]);
  vi.mocked(endpoints.listLabels).mockResolvedValue([]);
});

afterEach(async () => {
  await i18n.changeLanguage('pt');
});

describe('LibraryPage', () => {
  it('lista os recursos retornados por listResources', async () => {
    vi.mocked(endpoints.listResources).mockResolvedValue([
      makeResource() as never,
    ]);
    render(<LibraryPage />);
    await waitFor(() => screen.getByText('Domain-Driven Design'));
    expect(screen.getByTestId('library-list')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há recursos', async () => {
    render(<LibraryPage />);
    await waitFor(() => screen.getByText('Nada na biblioteca ainda'));
  });

  it('filtra por stage chamando listResources com o stage selecionado', async () => {
    const user = userEvent.setup();
    render(<LibraryPage />);
    await waitFor(() => screen.getByTestId('stage-filter-done'));

    await user.click(screen.getByTestId('stage-filter-done'));

    await waitFor(() =>
      expect(endpoints.listResources).toHaveBeenLastCalledWith({
        stage: 'done',
      }),
    );
  });

  it('filtra por label (client-side, mostra só os que têm a label)', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listResources).mockResolvedValue([
      makeResource({
        id: 'with',
        title: 'Com label',
        labelIds: ['l1'],
      }) as never,
      makeResource({
        id: 'without',
        title: 'Sem label',
        labelIds: [],
      }) as never,
    ]);
    vi.mocked(endpoints.listLabels).mockResolvedValue([
      {
        id: 'l1',
        userId: 'owner',
        name: 'Tech',
        parentId: null,
        color: null,
        status: 'ACTIVE',
        archivedAt: null,
        createdAt: '2026-06-01T00:00:00.000Z',
        children: [],
      } as never,
    ]);
    render(<LibraryPage />);

    await waitFor(() => screen.getByText('Com label'));
    expect(screen.getByText('Sem label')).toBeInTheDocument();

    await user.click(screen.getByTestId('label-filter-l1'));

    await waitFor(() => expect(screen.queryByText('Sem label')).toBeNull());
    expect(screen.getByText('Com label')).toBeInTheDocument();
  });

  it('cria um recurso e recarrega a lista', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.createResource).mockResolvedValue(
      makeResource() as never,
    );
    render(<LibraryPage />);
    await waitFor(() => screen.getByTestId('new-resource-button'));

    await user.click(screen.getByTestId('new-resource-button'));
    await user.type(screen.getByLabelText('Título'), 'Refactoring');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(endpoints.createResource).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Refactoring', type: 'book' }),
      ),
    );
  });
});
