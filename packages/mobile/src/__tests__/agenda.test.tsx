import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../lib/i18n/index.js';
import { AgendaPage } from '../pages/AgendaPage.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@cerebro/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SectionHeader: ({ label }: { label: string }) => <h2>{label}</h2>,
  EmptyState: ({ title }: { title: string }) => <p>{title}</p>,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('../components/QuickCaptureForm.js', () => ({
  QuickCaptureForm: () => <div data-testid="quick-capture-form" />,
}));

vi.mock('../lib/api/endpoints.js', () => ({
  getAgenda: vi.fn(),
  createCapture: vi.fn(),
  listActiveGoals: vi.fn(),
}));

import * as endpoints from '../lib/api/endpoints.js';

const TODAY_ISO = new Date('2026-06-04T12:00:00Z').toISOString();

function stubAgenda(overrides: object = {}) {
  return {
    date: TODAY_ISO,
    journal: {
      devotional: { done: false },
      reflection: { done: false },
    },
    capturesToReview: [],
    recallsDue: [],
    ...overrides,
  };
}

function renderAgendaPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<AgendaPage />} />
        <Route path="/editor" element={<div data-testid="editor-page" />} />
        <Route
          path="/editor/:noteId"
          element={<div data-testid="editor-page" />}
        />
        <Route path="/capture" element={<div data-testid="capture-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.mocked(endpoints.getAgenda).mockResolvedValue(stubAgenda());
  vi.mocked(endpoints.listActiveGoals).mockResolvedValue([]);
});

afterEach(async () => {
  vi.useRealTimers();
  await i18n.changeLanguage('pt');
});

// ── Renderização base ─────────────────────────────────────────────────────────

describe('AgendaPage — renderização', () => {
  it('mostra o formulário de captura rápida', async () => {
    renderAgendaPage();
    await waitFor(() => screen.getByTestId('quick-capture-form'));
  });

  it('mostra os dois cartões do diário', async () => {
    renderAgendaPage();
    await waitFor(() => screen.getByTestId('journal-card-devotional'));
    expect(screen.getByTestId('journal-card-reflection')).toBeInTheDocument();
  });
});

// ── Data do cabeçalho ──────────────────────────────────────────────────────────

describe('AgendaPage — data do cabeçalho', () => {
  it('mostra o dia correto a partir de uma data YYYY-MM-DD (sem voltar um dia por UTC)', async () => {
    // 2026-06-04 é uma quinta-feira. Em fuso negativo, `new Date('2026-06-04')`
    // exibiria quarta-feira 03 — este teste trava a regressão.
    vi.mocked(endpoints.getAgenda).mockResolvedValue(
      stubAgenda({ date: '2026-06-04' }),
    );
    renderAgendaPage();

    await waitFor(() => screen.getByText(/quinta-feira/i));
    expect(screen.getByText(/quinta-feira/i).textContent).toContain('4');
    expect(screen.queryByText(/quarta-feira/i)).toBeNull();
  });

  it('troca o dia da semana ao mudar o idioma para inglês', async () => {
    await i18n.changeLanguage('en');
    vi.mocked(endpoints.getAgenda).mockResolvedValue(
      stubAgenda({ date: '2026-06-04' }),
    );
    renderAgendaPage();

    await waitFor(() => screen.getByText(/Thursday/i));
    expect(screen.queryByText(/quinta-feira/i)).toBeNull();
  });
});

// ── Estado do diário ──────────────────────────────────────────────────────────

describe('AgendaPage — estado do diário', () => {
  it('mostra "Escrever" quando devocional não feito', async () => {
    vi.mocked(endpoints.getAgenda).mockResolvedValue(
      stubAgenda({
        journal: {
          devotional: { done: false },
          reflection: { done: false },
        },
      }),
    );
    renderAgendaPage();
    await waitFor(() => screen.getByTestId('journal-card-devotional'));

    const card = screen.getByTestId('journal-card-devotional');
    expect(card).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Escrever'),
    );
  });

  it('mostra "Feito hoje" quando devocional concluído', async () => {
    vi.mocked(endpoints.getAgenda).mockResolvedValue(
      stubAgenda({
        journal: {
          devotional: { done: true, noteId: 'note-dev' },
          reflection: { done: false },
        },
      }),
    );
    renderAgendaPage();
    await waitFor(() => screen.getByTestId('journal-card-devotional'));

    const card = screen.getByTestId('journal-card-devotional');
    expect(card).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Feito hoje'),
    );
  });

  it('cartão de devocional não feito navega para /editor?type=DEVOTIONAL', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAgendaPage();

    await waitFor(() => screen.getByTestId('journal-card-devotional'));
    await user.click(screen.getByTestId('journal-card-devotional'));

    await waitFor(() => screen.getByTestId('editor-page'));
  });

  it('cartão de devocional feito navega para /editor/:noteId', async () => {
    vi.mocked(endpoints.getAgenda).mockResolvedValue(
      stubAgenda({
        journal: {
          devotional: { done: true, noteId: 'note-abc' },
          reflection: { done: false },
        },
      }),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAgendaPage();

    await waitFor(() => screen.getByTestId('journal-card-devotional'));
    await user.click(screen.getByTestId('journal-card-devotional'));

    await waitFor(() => screen.getByTestId('editor-page'));
  });
});

// ── Capturas a revisar ────────────────────────────────────────────────────────

describe('AgendaPage — capturas a revisar', () => {
  it('mostra estado vazio quando não há capturas', async () => {
    renderAgendaPage();
    await waitFor(() => screen.getByText('Nenhuma captura para revisar'));
  });

  it('mostra preview das capturas quando há itens', async () => {
    vi.mocked(endpoints.getAgenda).mockResolvedValue(
      stubAgenda({
        capturesToReview: [
          {
            id: 'cap-1',
            userId: 'owner',
            text: 'Ideia para revisar',
            status: 'PENDING',
            reviewAt: TODAY_ISO,
            processedAt: null,
            promotedToType: null,
            promotedToId: null,
            archivedAt: null,
            archiveReason: null,
            createdAt: TODAY_ISO,
          },
        ],
      }),
    );
    renderAgendaPage();
    await waitFor(() => screen.getByText('Ideia para revisar'));
  });
});
