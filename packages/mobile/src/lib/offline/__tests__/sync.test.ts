import { describe, expect, it, vi } from 'vitest';

import { processQueue } from '../sync.js';
import type { Command, CommandQueue, OfflineApi, StoredCommand } from '../types.js';

// ── Fila fake em memória (núcleo testado sem IndexedDB) ─────────────────────────

class FakeQueue implements CommandQueue {
  private items: StoredCommand[] = [];
  private map = new Map<string, string>();
  private seq = 1;

  constructor(initial: Command[] = []) {
    for (const c of initial) this.items.push({ ...c, seq: this.seq++ } as StoredCommand);
  }

  enqueue(cmd: Command): Promise<void> {
    this.items.push({ ...cmd, seq: this.seq++ } as StoredCommand);
    return Promise.resolve();
  }
  all(): Promise<StoredCommand[]> {
    return Promise.resolve([...this.items].sort((a, b) => a.seq - b.seq));
  }
  remove(seq: number): Promise<void> {
    this.items = this.items.filter((i) => i.seq !== seq);
    return Promise.resolve();
  }
  size(): Promise<number> {
    return Promise.resolve(this.items.length);
  }
  mapId(clientId: string, realId: string): Promise<void> {
    this.map.set(clientId, realId);
    return Promise.resolve();
  }
  resolveRef(ref: string): Promise<string> {
    return Promise.resolve(this.map.get(ref) ?? ref);
  }
  clear(): Promise<void> {
    this.items = [];
    this.map.clear();
    return Promise.resolve();
  }
}

function fakeApi(overrides: Partial<OfflineApi> = {}): OfflineApi {
  return {
    createCapture: vi.fn(async () => ({ id: 'cap-real' })),
    createNote: vi.fn(async () => ({ id: 'note-real' })),
    editNote: vi.fn(async (id: string) => ({ id })),
    ...overrides,
  };
}

const capture = (id: string, text: string, seqTime: string): Command => ({
  id,
  type: 'createCapture',
  createdAt: seqTime,
  payload: { text },
});

// ── Testes ──────────────────────────────────────────────────────────────────────

describe('processQueue', () => {
  it('fila vazia → {synced:0, remaining:0} e não chama a API', async () => {
    const queue = new FakeQueue();
    const api = fakeApi();

    const result = await processQueue(queue, api);

    expect(result).toEqual({ synced: 0, remaining: 0 });
    expect(api.createCapture).not.toHaveBeenCalled();
  });

  it('tudo ok → envia cada comando e esvazia a fila', async () => {
    const queue = new FakeQueue([
      capture('a', 'um', '2026-06-04T10:00:00Z'),
      capture('b', 'dois', '2026-06-04T10:01:00Z'),
    ]);
    const api = fakeApi();

    const result = await processQueue(queue, api);

    expect(api.createCapture).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ synced: 2, remaining: 0 });
    expect(await queue.size()).toBe(0);
  });

  it('processa na ordem de inserção', async () => {
    const order: string[] = [];
    const queue = new FakeQueue([
      capture('a', 'primeiro', '2026-06-04T10:00:00Z'),
      capture('b', 'segundo', '2026-06-04T10:01:00Z'),
      capture('c', 'terceiro', '2026-06-04T10:02:00Z'),
    ]);
    const api = fakeApi({
      createCapture: vi.fn(async (text: string) => {
        order.push(text);
        return { id: 'x' };
      }),
    });

    await processQueue(queue, api);

    expect(order).toEqual(['primeiro', 'segundo', 'terceiro']);
  });

  it('falha de rede no meio → mantém o que falhou e o resto, sem duplicar', async () => {
    const queue = new FakeQueue([
      capture('a', 'um', '2026-06-04T10:00:00Z'),
      capture('b', 'dois', '2026-06-04T10:01:00Z'),
      capture('c', 'tres', '2026-06-04T10:02:00Z'),
    ]);
    const calls: string[] = [];
    const api = fakeApi({
      createCapture: vi.fn(async (text: string) => {
        calls.push(text);
        if (text === 'dois') throw new Error('offline');
        return { id: 'x' };
      }),
    });

    const result = await processQueue(queue, api);

    // 'um' enviou; 'dois' falhou e parou; 'tres' nem tentou.
    expect(calls).toEqual(['um', 'dois']);
    expect(result).toEqual({ synced: 1, remaining: 2 });

    // Re-tentativa após "voltar a rede": envia os restantes sem reenviar 'um'.
    const api2 = fakeApi();
    const result2 = await processQueue(queue, api2);
    expect(api2.createCapture).toHaveBeenCalledTimes(2);
    expect(api2.createCapture).not.toHaveBeenCalledWith('um');
    expect(result2).toEqual({ synced: 2, remaining: 0 });
  });

  it('reconcilia id temporário → real (createNote depois editNote)', async () => {
    const queue = new FakeQueue([
      {
        id: 'cmd-1',
        type: 'createNote',
        createdAt: '2026-06-04T10:00:00Z',
        payload: { clientId: 'temp-1', noteType: 'DEVOTIONAL', doc: { type: 'doc' } },
      },
      {
        id: 'cmd-2',
        type: 'editNote',
        createdAt: '2026-06-04T10:01:00Z',
        payload: { ref: 'temp-1', doc: { type: 'doc', content: [] } },
      },
    ]);
    const api = fakeApi({
      createNote: vi.fn(async () => ({ id: 'server-99' })),
      editNote: vi.fn(async (id: string) => ({ id })),
    });

    const result = await processQueue(queue, api);

    // editNote recebeu o id REAL, não o temporário.
    expect(api.editNote).toHaveBeenCalledWith('server-99', expect.any(Object));
    expect(result).toEqual({ synced: 2, remaining: 0 });
    expect(await queue.resolveRef('temp-1')).toBe('server-99');
  });
});
