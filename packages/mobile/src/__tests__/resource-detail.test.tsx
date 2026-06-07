import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../lib/i18n/index.js';
import { ResourceDetailPage } from '../pages/ResourceDetailPage.js';

vi.mock('@cerebro/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyState: ({ title }: { title: string }) => <p>{title}</p>,
  Button: ({
    children,
    ...rest
  }: { children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
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
  getResource: vi.fn(),
  listNotes: vi.fn(),
  archiveNote: vi.fn(),
  editResource: vi.fn(),
  listLabels: vi.fn(),
}));

import * as endpoints from '../lib/api/endpoints.js';

const RESOURCE = {
  id: 'res-1',
  userId: 'owner',
  title: 'Domain-Driven Design',
  type: 'book',
  url: null,
  author: 'Evans',
  description: null,
  stage: 'in_progress',
  status: 'ACTIVE',
  archivedAt: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  labelIds: [],
};

function note(id: string, plainText: string) {
  return {
    id,
    userId: 'owner',
    type: 'STUDY_NOTE',
    scope: 'DAY',
    date: '2026-06-03T00:00:00.000Z',
    doc: { type: 'doc', content: [] },
    plainText,
    resourceId: 'res-1',
    status: 'ACTIVE',
    createdAt: '2026-06-03T00:00:00.000Z',
  };
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/library/res-1']}>
      <Routes>
        <Route path="/library/:id" element={<ResourceDetailPage />} />
        <Route path="/editor" element={<div data-testid="editor-new" />} />
        <Route
          path="/editor/:noteId"
          element={<div data-testid="editor-page" />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(endpoints.getResource).mockResolvedValue(RESOURCE as never);
  vi.mocked(endpoints.listNotes).mockResolvedValue([]);
  vi.mocked(endpoints.listLabels).mockResolvedValue([]);
});

afterEach(async () => {
  await i18n.changeLanguage('pt');
});

describe('ResourceDetailPage', () => {
  it('mostra o recurso e suas notas referenciadas', async () => {
    vi.mocked(endpoints.listNotes).mockResolvedValue([
      note('n1', 'Capítulo 1') as never,
    ]);
    renderDetail();

    await waitFor(() => screen.getByText('Domain-Driven Design'));
    expect(endpoints.listNotes).toHaveBeenCalledWith({ resourceId: 'res-1' });
    expect(screen.getByText('Capítulo 1')).toBeInTheDocument();
  });

  it('estado vazio quando não há fichamentos', async () => {
    renderDetail();
    await waitFor(() =>
      screen.getByText(/Nenhum fichamento ainda/i),
    );
  });

  it('"Novo" abre o editor de fichamento já com o recurso', async () => {
    const user = userEvent.setup();
    renderDetail();
    await waitFor(() => screen.getByTestId('new-study-note'));

    await user.click(screen.getByTestId('new-study-note'));
    await waitFor(() => screen.getByTestId('editor-new'));
  });

  it('exclui um fichamento após confirmação', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listNotes).mockResolvedValue([
      note('n1', 'Capítulo 1') as never,
    ]);
    vi.mocked(endpoints.archiveNote).mockResolvedValue({} as never);
    renderDetail();

    await waitFor(() => screen.getByTestId('delete-note-n1'));
    await user.click(screen.getByTestId('delete-note-n1'));
    expect(endpoints.archiveNote).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('confirm-delete'));

    await waitFor(() => expect(endpoints.archiveNote).toHaveBeenCalledWith('n1'));
    await waitFor(() => expect(screen.queryByText('Capítulo 1')).toBeNull());
  });

  it('edita o recurso: abre o form preenchido e salva via editResource', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.editResource).mockResolvedValue({
      ...RESOURCE,
      title: 'DDD revisado',
    } as never);
    renderDetail();

    await waitFor(() => screen.getByTestId('edit-resource'));
    await user.click(screen.getByTestId('edit-resource'));

    const input = await screen.findByLabelText('Título');
    expect(input).toHaveValue('Domain-Driven Design'); // preenchido
    await user.clear(input);
    await user.type(input, 'DDD revisado');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(endpoints.editResource).toHaveBeenCalled());
    const [calledId, body] = vi.mocked(endpoints.editResource).mock.calls[0]!;
    expect(calledId).toBe('res-1');
    expect(body).toMatchObject({ title: 'DDD revisado', type: 'book' });
  });

  it('tocar numa nota abre o editor dela', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listNotes).mockResolvedValue([
      note('n1', 'Capítulo 1') as never,
    ]);
    renderDetail();

    await waitFor(() => screen.getByTestId('note-n1'));
    await user.click(screen.getByTestId('note-n1'));
    await waitFor(() => screen.getByTestId('editor-page'));
  });
});
