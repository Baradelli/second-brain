import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../lib/i18n/index.js';
import { NotesPage } from '../pages/NotesPage.js';

vi.mock('@cerebro/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyState: ({ title }: { title: string }) => <p>{title}</p>,
  BottomSheet: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
}));

vi.mock('../lib/api/endpoints.js', () => ({
  listNotes: vi.fn(),
}));

import * as endpoints from '../lib/api/endpoints.js';

function makeNote(overrides: Record<string, unknown> = {}) {
  return {
    id: 'n-1',
    userId: 'owner',
    type: 'DEVOTIONAL',
    scope: 'DAY',
    date: '2026-06-03T00:00:00.000Z',
    title: undefined,
    doc: { type: 'doc', content: [] },
    plainText: 'Gratidão pela manhã',
    status: 'ACTIVE',
    createdAt: '2026-06-03T10:00:00.000Z',
    ...overrides,
  };
}

function renderNotesPage() {
  return render(
    <MemoryRouter initialEntries={['/notes']}>
      <Routes>
        <Route path="/notes" element={<NotesPage />} />
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
  vi.mocked(endpoints.listNotes).mockResolvedValue([]);
});

afterEach(async () => {
  await i18n.changeLanguage('pt');
});

describe('NotesPage', () => {
  it('lista as notas (preview do plainText) e abre no editor ao tocar', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listNotes).mockResolvedValue([makeNote() as never]);
    renderNotesPage();

    await waitFor(() => screen.getByText('Gratidão pela manhã'));
    await user.click(screen.getByTestId('note-n-1'));
    await waitFor(() => screen.getByTestId('editor-page'));
  });

  it('estado vazio quando não há notas', async () => {
    renderNotesPage();
    await waitFor(() =>
      screen.getByText('Nenhuma nota ainda. Toque em Nova para começar.'),
    );
  });

  it('filtra por tipo chamando listNotes com o tipo', async () => {
    const user = userEvent.setup();
    renderNotesPage();
    await waitFor(() => screen.getByTestId('note-filter-REFLECTION'));

    await user.click(screen.getByTestId('note-filter-REFLECTION'));

    await waitFor(() =>
      expect(endpoints.listNotes).toHaveBeenLastCalledWith({
        status: 'ACTIVE',
        type: 'REFLECTION',
      }),
    );
  });

  it('"Nova" abre o seletor de tipo e navega para o editor com o tipo', async () => {
    const user = userEvent.setup();
    renderNotesPage();
    await waitFor(() => screen.getByTestId('new-note-button'));

    await user.click(screen.getByTestId('new-note-button'));
    await user.click(screen.getByTestId('write-type-DEVOTIONAL'));

    await waitFor(() => screen.getByTestId('editor-new'));
  });
});
