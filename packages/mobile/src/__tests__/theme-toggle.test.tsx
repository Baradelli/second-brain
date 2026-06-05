import { ThemeProvider, ThemeToggle } from '@cerebro/ui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: prefersDark && query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeEach(() => {
  document.documentElement.className = '';
  localStorage.clear();
  mockMatchMedia(false);
});

describe('ThemeToggle — alterna e persiste', () => {
  it('inicia em modo claro sem preferência salva', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('muda para escuro ao clicar e persiste no localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    await user.click(
      screen.getByRole('button', { name: /switch to dark mode/i }),
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('cerebro-theme')).toBe('dark');
  });

  it('muda de volta para claro ao clicar novamente', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    await user.click(
      screen.getByRole('button', { name: /switch to dark mode/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /switch to light mode/i }),
    );

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('cerebro-theme')).toBe('light');
  });

  it('lê tema escuro persistido do localStorage', () => {
    localStorage.setItem('cerebro-theme', 'dark');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('respeita prefers-color-scheme: dark na primeira visita', () => {
    mockMatchMedia(true);
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
