import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../lib/i18n/index.js';
import { SettingsPage } from '../pages/SettingsPage.js';

vi.mock('@cerebro/ui', () => ({
  Button: ({
    children,
    ...rest
  }: {
    children: React.ReactNode;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
}));

vi.mock('../lib/api/endpoints.js', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

import * as endpoints from '../lib/api/endpoints.js';

const SETTINGS = {
  reviewWeekday: 0,
  recapWeekday: 0,
  timezone: 'America/Sao_Paulo',
  devotionalTime: '07:00',
  reflectionTime: '21:00',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(endpoints.getSettings).mockResolvedValue(SETTINGS as never);
});

afterEach(async () => {
  await i18n.changeLanguage('pt');
});

describe('SettingsPage', () => {
  it('carrega e salva as configurações alteradas', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.updateSettings).mockResolvedValue({
      ...SETTINGS,
      timezone: 'America/New_York',
    } as never);
    render(<SettingsPage />);

    const tz = await screen.findByTestId('settings-timezone');
    await user.selectOptions(tz, 'America/New_York');
    await user.click(screen.getByTestId('settings-save'));

    await waitFor(() =>
      expect(endpoints.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ timezone: 'America/New_York' }),
      ),
    );
    await waitFor(() => screen.getByText('Salvo'));
  });

  it('mostra erro quando o carregamento falha', async () => {
    vi.mocked(endpoints.getSettings).mockRejectedValue(new Error('boom'));
    render(<SettingsPage />);
    await waitFor(() =>
      screen.getByText('Não foi possível carregar as configurações'),
    );
  });
});
