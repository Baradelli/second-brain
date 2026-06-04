import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EditorPage } from '../pages/EditorPage.js';

const SAMPLE_DOC = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Olá' }] }],
};

const CHANGED_DOC = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mudado' }] }],
};

const STUB_NOTE = (overrides: object = {}) => ({
  id: 'note-1',
  userId: 'owner',
  type: 'NOTE' as const,
  scope: 'DAY' as const,
  date: new Date().toISOString(),
  doc: SAMPLE_DOC,
  plainText: 'Olá',
  status: 'ACTIVE' as const,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// Mock @cerebro/ui sem importOriginal para evitar carregar TipTap no jsdom
vi.mock('@cerebro/ui', () => ({
  RichEditor: ({
    onChange,
    doc,
    placeholder,
  }: {
    onChange: (doc: Record<string, unknown>) => void;
    doc?: Record<string, unknown>;
    placeholder?: string;
  }) => (
    <div data-testid="rich-editor" data-placeholder={placeholder}>
      {doc && <span data-testid="loaded-doc">{JSON.stringify(doc)}</span>}
      <button
        data-testid="trigger-change"
        onClick={() => onChange(CHANGED_DOC)}
      >
        type
      </button>
    </div>
  ),
}));

vi.mock('../lib/api/endpoints.js', () => ({
  createNote: vi.fn(),
  editNote: vi.fn(),
  getTodayNote: vi.fn(),
  getNoteById: vi.fn(),
}));

import * as endpoints from '../lib/api/endpoints.js';

function renderEditor(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/editor/:noteId" element={<EditorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // shouldAdvanceTime: true permite waitFor funcionar com fake timers
  vi.useFakeTimers({ shouldAdvanceTime: true });

  vi.mocked(endpoints.getTodayNote).mockResolvedValue(null);
  vi.mocked(endpoints.getNoteById).mockResolvedValue(STUB_NOTE());
  vi.mocked(endpoints.createNote).mockResolvedValue(
    STUB_NOTE({ id: 'new-note', doc: CHANGED_DOC, plainText: 'Mudado' }),
  );
  vi.mocked(endpoints.editNote).mockResolvedValue(
    STUB_NOTE({ doc: CHANGED_DOC, plainText: 'Mudado' }),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Carregamento ──────────────────────────────────────────────────────────────

describe('EditorPage — carregamento', () => {
  it('nova nota (type=NOTE) começa com editor vazio', async () => {
    renderEditor('/editor?type=NOTE');

    await waitFor(() => screen.getByTestId('rich-editor'));

    expect(screen.queryByTestId('loaded-doc')).toBeNull();
    expect(endpoints.getTodayNote).not.toHaveBeenCalled();
    expect(endpoints.getNoteById).not.toHaveBeenCalled();
  });

  it('carrega nota existente por ID e repassa o doc ao editor', async () => {
    renderEditor('/editor/note-1');

    await waitFor(() => screen.getByTestId('loaded-doc'));

    expect(endpoints.getNoteById).toHaveBeenCalledWith('note-1');
    expect(screen.getByTestId('loaded-doc').textContent).toBe(
      JSON.stringify(SAMPLE_DOC),
    );
  });

  it('devocional: busca nota do dia existente e carrega', async () => {
    vi.mocked(endpoints.getTodayNote).mockResolvedValue(
      STUB_NOTE({ id: 'dev-today', type: 'DEVOTIONAL', scope: 'DAY' }),
    );

    renderEditor('/editor?type=DEVOTIONAL');

    await waitFor(() => screen.getByTestId('loaded-doc'));

    expect(endpoints.getTodayNote).toHaveBeenCalledWith('DEVOTIONAL');
    expect(screen.getByTestId('loaded-doc').textContent).toBe(
      JSON.stringify(SAMPLE_DOC),
    );
  });

  it('devocional: começa vazio quando não há nota de hoje', async () => {
    renderEditor('/editor?type=DEVOTIONAL');

    await waitFor(() => screen.getByTestId('rich-editor'));

    expect(endpoints.getTodayNote).toHaveBeenCalledWith('DEVOTIONAL');
    expect(screen.queryByTestId('loaded-doc')).toBeNull();
  });
});

// ── Auto-save / doc enviado ───────────────────────────────────────────────────

describe('EditorPage — auto-save (doc ↔ API)', () => {
  it('não salva imediatamente após mudança', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEditor('/editor?type=NOTE');

    await waitFor(() => screen.getByTestId('rich-editor'));
    await user.click(screen.getByTestId('trigger-change'));

    expect(endpoints.createNote).not.toHaveBeenCalled();
  });

  it('cria nota com o doc correto após 1.5s de debounce', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEditor('/editor?type=NOTE');

    await waitFor(() => screen.getByTestId('rich-editor'));
    await user.click(screen.getByTestId('trigger-change'));

    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });

    expect(endpoints.createNote).toHaveBeenCalledOnce();
    expect(endpoints.createNote).toHaveBeenCalledWith(
      expect.objectContaining({ doc: CHANGED_DOC, type: 'NOTE' }),
    );
    expect(endpoints.editNote).not.toHaveBeenCalled();
  });

  it('edita nota existente (não cria nova) quando noteId está na rota', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEditor('/editor/note-1');

    await waitFor(() => screen.getByTestId('rich-editor'));
    await user.click(screen.getByTestId('trigger-change'));

    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });

    expect(endpoints.editNote).toHaveBeenCalledOnce();
    expect(endpoints.editNote).toHaveBeenCalledWith('note-1', {
      doc: CHANGED_DOC,
    });
    expect(endpoints.createNote).not.toHaveBeenCalled();
  });

  it('exibe "Salvando…" durante debounce e "Salvo" após sucesso', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEditor('/editor?type=NOTE');

    await waitFor(() => screen.getByTestId('rich-editor'));
    await user.click(screen.getByTestId('trigger-change'));

    expect(screen.getByText('Salvando…')).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });

    await waitFor(() => screen.getByText('Salvo'));
  });
});
