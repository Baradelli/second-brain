import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { LanguageSwitcher } from '../components/LanguageSwitcher.js';
import { AgendaPage } from '../pages/AgendaPage.js';

vi.mock('@cerebro/shared/client', () => ({
  getAgenda: vi.fn().mockResolvedValue({
    date: new Date().toISOString(),
    journal: { devotional: { done: false }, reflection: { done: false } },
    capturesToReview: [],
    recallsDue: [],
  }),
  createCapture: vi.fn(),
  listActiveGoals: vi.fn().mockResolvedValue([]),
}));

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

describe('smoke: app mounts and i18n works', () => {
  it('renders AgendaPage with pt greeting text', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AgendaPage />
        </MemoryRouter>,
      );
    });
    expect(screen.getByText('Cada dia começa em branco')).toBeInTheDocument();
  });

  it('LanguageSwitcher toggles pt ↔ en (greeting subtitle)', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <MemoryRouter>
          <LanguageSwitcher />
          <AgendaPage />
        </MemoryRouter>,
      );
    });

    expect(screen.getByText('Cada dia começa em branco')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /english/i }));

    expect(screen.getByText('Every day starts fresh')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /português/i }));

    expect(screen.getByText('Cada dia começa em branco')).toBeInTheDocument();
  });
});
