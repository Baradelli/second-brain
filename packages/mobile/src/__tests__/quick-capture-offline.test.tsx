import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QuickCaptureForm } from '../components/QuickCaptureForm.js';

vi.mock('@cerebro/ui', () => ({
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

vi.mock('../lib/api/endpoints.js', () => ({
  createCapture: vi.fn(),
  createNote: vi.fn(),
  editNote: vi.fn(),
}));

import * as endpoints from '../lib/api/endpoints.js';

const onLineSpy = vi.spyOn(navigator, 'onLine', 'get');

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  onLineSpy.mockReturnValue(true);
});

describe('QuickCaptureForm — captura offline', () => {
  it('offline: enfileira sem chamar a API e confirma "salvo offline"', async () => {
    onLineSpy.mockReturnValue(false);

    render(<QuickCaptureForm />);

    await userEvent.type(screen.getByRole('textbox'), 'Ideia no busão');
    await userEvent.click(screen.getByRole('button', { name: /capturar/i }));

    // Não tentou a rede (estava offline) e confirmou que guardou offline.
    expect(endpoints.createCapture).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText(/salvo offline/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('online: envia normalmente pela API', async () => {
    onLineSpy.mockReturnValue(true);
    vi.mocked(endpoints.createCapture).mockResolvedValue({
      id: 'cap-1',
    } as never);

    render(<QuickCaptureForm />);

    await userEvent.type(screen.getByRole('textbox'), 'Ideia com sinal');
    await userEvent.click(screen.getByRole('button', { name: /capturar/i }));

    await waitFor(() =>
      expect(endpoints.createCapture).toHaveBeenCalledWith('Ideia com sinal'),
    );
  });
});
