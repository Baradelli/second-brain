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

const STUB_ATTACHMENT = (overrides: object = {}) => ({
  id: 'att-1',
  userId: 'owner',
  noteId: 'note-1',
  captureId: null,
  url: 'data:image/png;base64,abc',
  type: 'image',
  mimeType: 'image/png',
  name: 'foto.png',
  size: 100,
  transcription: null,
  ocrStatus: null,
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
  BottomSheet: ({
    open,
    onClose,
    children,
  }: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div data-testid="bottom-sheet" role="dialog">
        <button data-testid="sheet-close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    ) : null,
}));

vi.mock('../lib/api/endpoints.js', () => ({
  createCapture: vi.fn(),
  createNote: vi.fn(),
  editNote: vi.fn(),
  getTodayNote: vi.fn(),
  getNoteById: vi.fn(),
  getSuggestedQuestions: vi.fn(),
  uploadAttachmentFile: vi.fn(),
  attachFileToNote: vi.fn(),
  getNoteAttachments: vi.fn(),
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
  localStorage.clear(); // evita vazamento de rascunho entre testes
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
  vi.mocked(endpoints.getSuggestedQuestions).mockResolvedValue([]);
  vi.mocked(endpoints.getNoteAttachments).mockResolvedValue([]);
  vi.mocked(endpoints.uploadAttachmentFile).mockResolvedValue(
    'http://test.local/uploads/abc.png',
  );
  vi.mocked(endpoints.attachFileToNote).mockResolvedValue(STUB_ATTACHMENT());
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

  it('rascunho local tem precedência sobre o doc do servidor', async () => {
    const DRAFT_DOC = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rascunho offline' }] }],
    };
    // Rascunho salvo (ex.: escrita offline anterior) para a nota note-1.
    localStorage.setItem('cerebro.draft.note.note-1', JSON.stringify(DRAFT_DOC));

    renderEditor('/editor/note-1');

    await waitFor(() => screen.getByTestId('loaded-doc'));
    expect(screen.getByTestId('loaded-doc').textContent).toBe(
      JSON.stringify(DRAFT_DOC),
    );
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

// ── Perguntas sugeridas ───────────────────────────────────────────────────────

describe('EditorPage — painel de perguntas sugeridas', () => {
  it('abre painel e exibe perguntas agrupadas por label', async () => {
    vi.mocked(endpoints.getNoteById).mockResolvedValue(
      STUB_NOTE({ labelIds: ['label-1'] }),
    );
    vi.mocked(endpoints.getSuggestedQuestions).mockResolvedValue([
      {
        label: { id: 'label-1', name: 'Espiritualidade' },
        questions: [
          { id: 'q-1', labelId: 'label-1', text: 'O que aprendeu hoje?', order: 0, active: true },
          { id: 'q-2', labelId: 'label-1', text: 'O que ficou como gratidão?', order: 1, active: true },
        ],
      },
    ]);

    renderEditor('/editor/note-1');
    await waitFor(() => screen.getByTestId('rich-editor'));

    await userEvent.click(screen.getByRole('button', { name: /perguntas/i }));

    await waitFor(() => screen.getByText('Espiritualidade'));
    expect(screen.getByText('O que aprendeu hoje?')).toBeInTheDocument();
    expect(screen.getByText('O que ficou como gratidão?')).toBeInTheDocument();
    expect(endpoints.getSuggestedQuestions).toHaveBeenCalledWith(['label-1']);
  });

  it('exibe estado vazio quando a nota não tem perguntas para os labels', async () => {
    vi.mocked(endpoints.getSuggestedQuestions).mockResolvedValue([]);

    renderEditor('/editor/note-1');
    await waitFor(() => screen.getByTestId('rich-editor'));

    await userEvent.click(screen.getByRole('button', { name: /perguntas/i }));

    await waitFor(() =>
      screen.getByText(/nenhuma pergunta para os labels/i),
    );
  });
});

// ── Anexos ────────────────────────────────────────────────────────────────────

describe('EditorPage — painel de anexos', () => {
  it('carrega e exibe anexos existentes ao abrir painel', async () => {
    vi.mocked(endpoints.getNoteAttachments).mockResolvedValue([
      STUB_ATTACHMENT(),
    ]);

    renderEditor('/editor/note-1');
    await waitFor(() => screen.getByTestId('rich-editor'));

    // Anexos são carregados assim que noteId é definido
    await waitFor(() =>
      expect(endpoints.getNoteAttachments).toHaveBeenCalledWith('note-1'),
    );

    await userEvent.click(screen.getByRole('button', { name: /foto/i }));

    await waitFor(() => screen.getByRole('dialog'));

    const img = screen.getByRole('img', { name: /foto\.png|anexo/i });
    expect(img).toBeInTheDocument();
  });

  it('faz upload do arquivo e grava o anexo com a URL devolvida', async () => {
    const UPLOADED_URL = 'http://test.local/uploads/nova.png';
    const NEW_ATTACHMENT = STUB_ATTACHMENT({
      id: 'att-2',
      name: 'nova.png',
      url: UPLOADED_URL,
    });
    vi.mocked(endpoints.uploadAttachmentFile).mockResolvedValue(UPLOADED_URL);
    vi.mocked(endpoints.attachFileToNote).mockResolvedValue(NEW_ATTACHMENT);

    renderEditor('/editor/note-1');
    await waitFor(() => screen.getByTestId('rich-editor'));

    await userEvent.click(screen.getByRole('button', { name: /foto/i }));
    await waitFor(() => screen.getByRole('dialog'));

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['content'], 'nova.png', { type: 'image/png' });
    await userEvent.upload(fileInput, file);

    // 1) o arquivo sobe pro servidor
    await waitFor(() =>
      expect(endpoints.uploadAttachmentFile).toHaveBeenCalledWith(file),
    );

    // 2) o anexo é gravado com a URL devolvida pelo upload
    await waitFor(() =>
      expect(endpoints.attachFileToNote).toHaveBeenCalledWith(
        'note-1',
        expect.objectContaining({ url: UPLOADED_URL, type: 'image' }),
      ),
    );

    // 3) o novo anexo aparece na lista
    await waitFor(() =>
      expect(screen.getByRole('img', { name: /nova\.png/i })).toBeInTheDocument(),
    );
  });
});
