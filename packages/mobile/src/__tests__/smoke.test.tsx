import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { LanguageSwitcher } from '../components/LanguageSwitcher.js';
import { AgendaPage } from '../pages/AgendaPage.js';

describe('smoke: app mounts and i18n works', () => {
  it('renders AgendaPage with pt text', () => {
    render(
      <MemoryRouter>
        <AgendaPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Agenda de hoje')).toBeInTheDocument();
  });

  it('LanguageSwitcher toggles pt ↔ en', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LanguageSwitcher />
        <AgendaPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Agenda de hoje')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /english/i }));

    expect(screen.getByText("Today's agenda")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /português/i }));

    expect(screen.getByText('Agenda de hoje')).toBeInTheDocument();
  });
});
