import { i18n } from '@cerebro/ui';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LabelPicker } from '../components/LabelPicker.js';

vi.mock('@cerebro/shared/client', () => ({
  listLabels: vi.fn(),
}));

import * as endpoints from '@cerebro/shared/client';

function labelNode(id: string, name: string, color: string | null = null) {
  return {
    id,
    userId: 'owner',
    name,
    parentId: null,
    color,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    children: [],
  };
}

function Harness() {
  const [value, setValue] = useState<string[]>([]);
  return (
    <>
      <LabelPicker value={value} onChange={setValue} />
      <span data-testid="selected">{value.join(',')}</span>
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(endpoints.listLabels).mockResolvedValue([]);
});

afterEach(async () => {
  await i18n.changeLanguage('pt');
});

describe('LabelPicker', () => {
  it('lista as labels e alterna a seleção', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listLabels).mockResolvedValue([
      labelNode('a', 'Tech', '#3B82F6') as never,
      labelNode('b', 'Saúde', '#22C55E') as never,
    ]);
    render(<Harness />);

    await waitFor(() => screen.getByTestId('pick-label-a'));

    await user.click(screen.getByTestId('pick-label-a'));
    expect(screen.getByTestId('selected').textContent).toBe('a');

    await user.click(screen.getByTestId('pick-label-b'));
    expect(screen.getByTestId('selected').textContent).toBe('a,b');

    // toggle off
    await user.click(screen.getByTestId('pick-label-a'));
    expect(screen.getByTestId('selected').textContent).toBe('b');
  });

  it('mostra estado vazio quando não há labels', async () => {
    render(<Harness />);
    await waitFor(() => screen.getByText(/Nenhuma label criada ainda/i));
  });

  it('degrada para vazio se o carregamento falhar', async () => {
    vi.mocked(endpoints.listLabels).mockRejectedValue(new Error('net'));
    render(<Harness />);
    await waitFor(() => screen.getByText(/Nenhuma label criada ainda/i));
  });
});
