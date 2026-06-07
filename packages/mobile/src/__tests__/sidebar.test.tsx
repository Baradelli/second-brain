import { Sidebar } from '@cerebro/ui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookOpen } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const items = [
  { to: '/library', icon: <BookOpen size={18} />, label: 'Biblioteca' },
  { to: '/goals', icon: <BookOpen size={18} />, label: 'Objetivos' },
];

function renderSidebar(open: boolean, onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <Sidebar
        open={open}
        onClose={onClose}
        items={items}
        title="Segundo Cérebro"
      />
    </MemoryRouter>,
  );
  return onClose;
}

describe('Sidebar', () => {
  it('renders the nav items when open', () => {
    renderSidebar(true);
    expect(screen.getByText('Biblioteca')).toBeInTheDocument();
    expect(screen.getByText('Objetivos')).toBeInTheDocument();
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = renderSidebar(true);
    await user.click(screen.getByTestId('sidebar-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when a nav item is selected', async () => {
    const user = userEvent.setup();
    const onClose = renderSidebar(true);
    await user.click(screen.getByText('Biblioteca'));
    expect(onClose).toHaveBeenCalled();
  });
});
