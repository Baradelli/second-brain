import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LabelFilter } from '../components/LabelFilter.js';
import i18n from '../lib/i18n/index.js';

vi.mock('../lib/api/endpoints.js', () => ({
  listLabels: vi.fn(),
}));

import * as endpoints from '../lib/api/endpoints.js';

function labelNode(id: string, name: string) {
  return {
    id,
    userId: 'owner',
    name,
    parentId: null,
    color: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    children: [],
  };
}

function Harness() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <>
      <LabelFilter value={value} onChange={setValue} />
      <span data-testid="selected">{value ?? 'none'}</span>
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

describe('LabelFilter', () => {
  it('não renderiza nada quando não há labels', async () => {
    const { container } = render(<Harness />);
    await waitFor(() => expect(endpoints.listLabels).toHaveBeenCalled());
    expect(screen.queryByTestId('label-filter')).toBeNull();
    expect(container.querySelector('[data-testid="label-filter"]')).toBeNull();
  });

  it('seleciona e limpa (toggle volta para Todas)', async () => {
    const user = userEvent.setup();
    vi.mocked(endpoints.listLabels).mockResolvedValue([
      labelNode('a', 'Tech') as never,
    ]);
    render(<Harness />);

    await waitFor(() => screen.getByTestId('label-filter-a'));

    await user.click(screen.getByTestId('label-filter-a'));
    expect(screen.getByTestId('selected').textContent).toBe('a');

    await user.click(screen.getByTestId('label-filter-a')); // toggle off
    expect(screen.getByTestId('selected').textContent).toBe('none');
  });
});
