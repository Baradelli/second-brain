// @vitest-environment jsdom
import '@testing-library/jest-dom';

import { en, pt } from '@cerebro/shared/locales';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from '../LoginPage.js';

// @cerebro/ui é mockado abaixo, então inicializamos o i18next aqui (mesmas
// chaves login.*) para que as labels apareçam traduzidas (pt).
beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    resources: { pt: { translation: pt }, en: { translation: en } },
    lng: 'pt',
    fallbackLng: 'pt',
    interpolation: { escapeValue: false },
  });
});

// Mock leve dos primitivos de UI. Usamos createElement (e não JSX) dentro da
// factory porque vi.mock é içado para o topo, antes do import do jsx-runtime.
vi.mock('@cerebro/ui', async () => {
  const { createElement, forwardRef } = await import('react');
  return {
    Button: ({
      children,
      ...rest
    }: {
      children: React.ReactNode;
    } & React.ButtonHTMLAttributes<HTMLButtonElement>) =>
      createElement('button', rest, children),
    Input: forwardRef<
      HTMLInputElement,
      {
        label?: string;
        error?: string;
      } & React.InputHTMLAttributes<HTMLInputElement>
    >(({ label, error, ...props }, ref) =>
      createElement(
        'label',
        null,
        label,
        createElement('input', { 'aria-label': label, ref, ...props }),
        error ? createElement('span', null, error) : null,
      ),
    ),
  };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

vi.mock('@cerebro/shared/client', () => ({
  login: vi.fn(),
  setToken: vi.fn(),
}));

import { login, setToken } from '@cerebro/shared/client';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginPage', () => {
  it('faz login, guarda o token e navega para a home', async () => {
    const user = userEvent.setup();
    vi.mocked(login).mockResolvedValue({ token: 'jwt-123' });
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'owner@cerebro.local');
    await user.type(screen.getByLabelText('Senha'), 's3nha');
    await user.click(screen.getByTestId('login-submit'));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith('owner@cerebro.local', 's3nha'),
    );
    expect(setToken).toHaveBeenCalledWith('jwt-123');
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('bloqueia submit inválido (email vazio) e não chama o endpoint', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    // Sem preencher email: zodResolver barra o submit.
    await user.type(screen.getByLabelText('Senha'), 's3nha');
    await user.click(screen.getByTestId('login-submit'));

    await waitFor(() =>
      expect(screen.getByText('Email inválido')).toBeInTheDocument(),
    );
    expect(login).not.toHaveBeenCalled();
    expect(setToken).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
