import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import { OfflineQueue } from '../queue.js';
import type { Command } from '../types.js';

let dbCounter = 0;
function freshQueue() {
  dbCounter += 1;
  return new OfflineQueue(`cerebro-offline-test-${dbCounter}`);
}

const capture = (text: string, createdAt: string): Command => ({
  id: `id-${text}`,
  type: 'createCapture',
  createdAt,
  payload: { text },
});

describe('OfflineQueue (IndexedDB)', () => {
  it('enfileira e lista em ordem de inserção, com seq', async () => {
    const queue = freshQueue();
    await queue.enqueue(capture('um', '2026-06-04T10:00:00Z'));
    await queue.enqueue(capture('dois', '2026-06-04T10:01:00Z'));

    const all = await queue.all();
    expect(all.map((c) => c.type === 'createCapture' && c.payload.text)).toEqual([
      'um',
      'dois',
    ]);
    expect(all[0]!.seq).toBeLessThan(all[1]!.seq);
    expect(await queue.size()).toBe(2);
  });

  it('persiste entre instâncias (sobrevive a reload)', async () => {
    dbCounter += 1;
    const dbName = `cerebro-offline-persist-${dbCounter}`;

    const first = new OfflineQueue(dbName);
    await first.enqueue(capture('persistido', '2026-06-04T10:00:00Z'));

    // Nova instância do mesmo "banco" = simula reabrir o app.
    const second = new OfflineQueue(dbName);
    const all = await second.all();
    expect(all).toHaveLength(1);
    expect(all[0]!.type === 'createCapture' && all[0]!.payload.text).toBe(
      'persistido',
    );
  });

  it('remove um comando pela seq', async () => {
    const queue = freshQueue();
    await queue.enqueue(capture('um', '2026-06-04T10:00:00Z'));
    await queue.enqueue(capture('dois', '2026-06-04T10:01:00Z'));

    const all = await queue.all();
    await queue.remove(all[0]!.seq);

    const left = await queue.all();
    expect(left).toHaveLength(1);
    expect(left[0]!.type === 'createCapture' && left[0]!.payload.text).toBe('dois');
  });

  it('mapeia e resolve id temporário → real (e passthrough quando não há mapa)', async () => {
    const queue = freshQueue();
    await queue.mapId('temp-1', 'real-1');

    expect(await queue.resolveRef('temp-1')).toBe('real-1');
    expect(await queue.resolveRef('desconhecido')).toBe('desconhecido');
  });

  it('clear esvazia fila e mapa', async () => {
    const queue = freshQueue();
    await queue.enqueue(capture('um', '2026-06-04T10:00:00Z'));
    await queue.mapId('temp-1', 'real-1');

    await queue.clear();

    expect(await queue.size()).toBe(0);
    expect(await queue.resolveRef('temp-1')).toBe('temp-1');
  });
});
