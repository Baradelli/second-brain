import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { forwardRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from '../pages/LoginPage.js';

vi.mock('@cerebro/ui', () => ({
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
    { label?: string } & React.InputHTMLAttributes<HTMLInputElement>
  >(({ label, ...props }, ref) => (
    <label>
      {label}
      <input aria-label={label} ref={ref} {...props} />
    </label>
  )),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

vi.mock('@cerebro/shared/client', () => ({
  login: vi.fn(),
  setToken: vi.fn(),
}));

import * as auth from '@cerebro/shared/client';
import * as endpoints from '@cerebro/shared/client';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  await i18n.changeLanguage('pt');
});

describe('LoginPage', () => {
  it('faz login, guarda o token e navega para a home', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.login).mockResolvedValue({ token: 'jwt-123' });
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'owner@cerebro.local');
    await user.type(screen.getByLabelText('Senha'), 's3nha');
    await user.click(screen.getByTestId('login-submit'));

    await waitFor(() =>
      expect(endpoints.login).toHaveBeenCalledWith(
        'owner@cerebro.local',
        's3nha',
      ),
    );
    expect(auth.setToken).toHaveBeenCalledWith('jwt-123');
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('mostra erro quando o login falha', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.login).mockRejectedValue(new Error('401'));
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'owner@cerebro.local');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByTestId('login-submit'));

    await waitFor(() => screen.getByText('Email ou senha incorretos'));
    expect(auth.setToken).not.toHaveBeenCalled();
  });
});
