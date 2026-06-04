import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CapturePage } from '../pages/CapturePage.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@cerebro/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant: _v,
    size: _s,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SectionHeader: ({ label }: { label: string }) => <h2>{label}</h2>,
  EmptyState: ({ title }: { title: string }) => <p>{title}</p>,
  BottomSheet: ({
    open,
    children,
    onClose,
  }: {
    open: boolean;
    children: React.ReactNode;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="promote-sheet">
        <button data-testid="sheet-close" onClick={onClose}>
          fechar
        </button>
        {children}
      </div>
    ) : null,
}));

vi.mock('../lib/api/endpoints.js', () => ({
  createCapture: vi.fn(),
  listCaptures: vi.fn(),
  archiveCapture: vi.fn(),
  promoteCaptureToNote: vi.fn(),
}));

import * as endpoints from '../lib/api/endpoints.js';

const STUB_CAPTURE = (overrides: object = {}) => ({
  id: 'cap-1',
  userId: 'owner',
  text: 'Ideia importante',
  status: 'PENDING' as const,
  reviewAt: null,
  processedAt: null,
  promotedToType: null,
  promotedToId: null,
  archivedAt: null,
  archiveReason: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const STUB_NOTE = () => ({
  id: 'note-new',
  userId: 'owner',
  type: 'NOTE' as const,
  scope: 'DAY' as const,
  date: new Date().toISOString(),
  doc: { type: 'doc', content: [] },
  plainText: '',
  status: 'ACTIVE' as const,
  createdAt: new Date().toISOString(),
});

function renderCapturePage() {
  return render(
    <MemoryRouter initialEntries={['/capture']}>
      <Routes>
        <Route path="/capture" element={<CapturePage />} />
        <Route
          path="/editor/:noteId"
          element={<div data-testid="editor-page">Editor</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.mocked(endpoints.listCaptures).mockResolvedValue([]);
  vi.mocked(endpoints.createCapture).mockResolvedValue(STUB_CAPTURE());
  vi.mocked(endpoints.archiveCapture).mockResolvedValue(
    STUB_CAPTURE({ status: 'ARCHIVED', archivedAt: new Date().toISOString() }),
  );
  vi.mocked(endpoints.promoteCaptureToNote).mockResolvedValue({
    note: STUB_NOTE(),
    capture: STUB_CAPTURE({ status: 'PROCESSED' }),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Captura rápida ────────────────────────────────────────────────────────────

describe('CapturePage — captura rápida', () => {
  it('envia o texto digitado e limpa o campo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCapturePage();

    await waitFor(() => screen.getByRole('textbox'));

    await user.type(screen.getByRole('textbox'), 'Nova ideia');
    await user.click(screen.getByRole('button', { name: 'Capturar' }));

    expect(endpoints.createCapture).toHaveBeenCalledWith('Nova ideia');
    await waitFor(() =>
      expect(screen.getByRole('textbox')).toHaveValue(''),
    );
  });

  it('não envia com texto vazio', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCapturePage();

    await waitFor(() => screen.getByRole('textbox'));

    await user.click(screen.getByRole('button', { name: 'Capturar' }));

    expect(endpoints.createCapture).not.toHaveBeenCalled();
  });

  it('exibe "Capturado!" após envio bem-sucedido', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCapturePage();

    await waitFor(() => screen.getByRole('textbox'));

    await user.type(screen.getByRole('textbox'), 'Ideia');
    await user.click(screen.getByRole('button', { name: 'Capturar' }));

    await waitFor(() =>
      expect(screen.getByText(/Capturado!/)).toBeInTheDocument(),
    );
  });
});

// ── Fila de revisão ───────────────────────────────────────────────────────────

describe('CapturePage — fila de pendentes', () => {
  it('lista as capturas pendentes ao abrir', async () => {
    vi.mocked(endpoints.listCaptures).mockImplementation(async (status) => {
      if (status === 'PENDING') return [STUB_CAPTURE({ text: 'Captura A' })];
      return [];
    });

    renderCapturePage();

    await waitFor(() => screen.getByText('Captura A'));
  });

  it('mostra estado vazio quando não há pendentes', async () => {
    renderCapturePage();

    await waitFor(() =>
      screen.getByText('Nenhuma captura para revisar. Boa!'),
    );
  });

  it('arquivar chama a API e remove a captura da lista', async () => {
    vi.mocked(endpoints.listCaptures).mockResolvedValue([
      STUB_CAPTURE({ id: 'cap-1', text: 'Para arquivar' }),
    ]);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCapturePage();

    await waitFor(() => screen.getByText('Para arquivar'));

    await user.click(screen.getByRole('button', { name: 'Arquivar' }));

    expect(endpoints.archiveCapture).toHaveBeenCalledWith('cap-1');
    await waitFor(() =>
      expect(screen.queryByText('Para arquivar')).toBeNull(),
    );
  });
});

// ── Promover para nota ────────────────────────────────────────────────────────

describe('CapturePage — promover para nota', () => {
  it('abre o sheet de tipo ao clicar em promover', async () => {
    vi.mocked(endpoints.listCaptures).mockResolvedValue([
      STUB_CAPTURE({ text: 'Captura X' }),
    ]);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCapturePage();

    await waitFor(() => screen.getByText('Captura X'));

    await user.click(screen.getByRole('button', { name: '→ Nota' }));

    expect(screen.getByTestId('promote-sheet')).toBeInTheDocument();
  });

  it('promove com o tipo escolhido e navega para o editor', async () => {
    vi.mocked(endpoints.listCaptures).mockResolvedValue([
      STUB_CAPTURE({ id: 'cap-2', text: 'Captura Y' }),
    ]);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCapturePage();

    await waitFor(() => screen.getByText('Captura Y'));

    await user.click(screen.getByRole('button', { name: '→ Nota' }));

    const sheet = screen.getByTestId('promote-sheet');
    await user.click(within(sheet).getByText('Nota'));

    expect(endpoints.promoteCaptureToNote).toHaveBeenCalledWith('cap-2', 'NOTE');

    await act(async () => {});

    await waitFor(() => screen.getByTestId('editor-page'));
  });
});

// ── Arquivados ────────────────────────────────────────────────────────────────

describe('CapturePage — arquivados', () => {
  it('carrega e exibe arquivados ao expandir a seção', async () => {
    vi.mocked(endpoints.listCaptures).mockImplementation(async (status) => {
      if (status === 'ARCHIVED')
        return [STUB_CAPTURE({ id: 'arch-1', text: 'Arquivada há tempos', status: 'ARCHIVED' })];
      return [];
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCapturePage();

    await waitFor(() => screen.getByText('Nenhuma captura para revisar. Boa!'));

    await user.click(screen.getByRole('button', { name: /ver arquivados/i }));

    await waitFor(() => screen.getByText('Arquivada há tempos'));
    expect(endpoints.listCaptures).toHaveBeenCalledWith('ARCHIVED');
  });
});
