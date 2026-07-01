import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { forwardRef } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LibraryPage } from '../pages/LibraryPage.js';

function renderLibrary() {
  return render(
    <MemoryRouter initialEntries={['/library']}>
      <Routes>
        <Route path="/library" element={<LibraryPage />} />
        <Route
          path="/library/:id"
          element={<div data-testid="resource-detail" />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

// Mantém o `ResourceForm` real (vindo de `@cerebro/ui`) para o fluxo de criar
// recurso, trocando só os primitivos por stubs.
vi.mock('@cerebro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cerebro/ui')>();
  return {
    ...actual,
    Card: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
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
  };
});

vi.mock('@cerebro/shared/client', () => ({
  listResources: vi.fn(),
  createResource: vi.fn(),
  editResource: vi.fn(),
  listLabels: vi.fn(),
}));

import * as endpoints from '@cerebro/shared/client';

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
    renderLibrary();
    await waitFor(() => screen.getByText('Domain-Driven Design'));
    expect(screen.getByTestId('library-list')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há recursos', async () => {
    renderLibrary();
    await waitFor(() => screen.getByText('Nada na biblioteca ainda'));
  });

  it('filtra por stage chamando listResources com o stage selecionado', async () => {
    const user = userEvent.setup();
    renderLibrary();
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
    renderLibrary();

    await waitFor(() => screen.getByText('Com label'));
    expect(screen.getByText('Sem label')).toBeInTheDocument();

    await user.click(screen.getByTestId('label-filter-l1'));

    await waitFor(() => expect(screen.queryByText('Sem label')).toBeNull());
    expect(screen.getByText('Com label')).toBeInTheDocument();
  });

  it('filtra por tipo (client-side)', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listResources).mockResolvedValue([
      makeResource({ id: 'b', title: 'Um livro', type: 'book' }) as never,
      makeResource({ id: 'c', title: 'Um curso', type: 'course' }) as never,
    ]);
    renderLibrary();
    await waitFor(() => screen.getByText('Um livro'));

    await user.selectOptions(screen.getByTestId('type-filter'), 'course');

    await waitFor(() => expect(screen.queryByText('Um livro')).toBeNull());
    expect(screen.getByText('Um curso')).toBeInTheDocument();
  });

  it('ordena por título', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listResources).mockResolvedValue([
      makeResource({ id: 'z', title: 'Zebra' }) as never,
      makeResource({ id: 'a', title: 'Abelha' }) as never,
    ]);
    renderLibrary();
    await waitFor(() => screen.getByTestId('library-list'));

    await user.selectOptions(screen.getByTestId('sort-by'), 'title');

    await waitFor(() => {
      const cards = screen.getAllByTestId(/^open-resource-/);
      expect(cards[0]).toHaveAttribute('data-testid', 'open-resource-a');
      expect(cards[1]).toHaveAttribute('data-testid', 'open-resource-z');
    });
  });

  it('tocar num recurso abre o detalhe', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listResources).mockResolvedValue([
      makeResource() as never,
    ]);
    renderLibrary();
    await waitFor(() => screen.getByTestId('open-resource-res-1'));

    await user.click(screen.getByTestId('open-resource-res-1'));
    await waitFor(() => screen.getByTestId('resource-detail'));
  });

  it('cria um recurso e recarrega a lista', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.createResource).mockResolvedValue(
      makeResource() as never,
    );
    renderLibrary();
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
