import { type IDBPDatabase,openDB } from 'idb';

import type { Command, CommandQueue, StoredCommand } from './types.js';

const DB_NAME = 'cerebro-offline';
const QUEUE_STORE = 'queue';
const IDMAP_STORE = 'idmap';

/**
 * Fila de operações de escrita pendentes, persistida em IndexedDB (decisão da
 * spec da Tarefa 24 — não localStorage). Sobrevive a reload/fechar o app.
 * A chave `seq` é auto-incremental, então `getAll` devolve em ordem de inserção.
 */
export class OfflineQueue implements CommandQueue {
  // null quando não há IndexedDB (SSR/ambiente de teste sem polyfill): a fila
  // degrada para no-op em vez de quebrar. No browser real, indexedDB existe.
  private dbPromise: Promise<IDBPDatabase> | null;

  constructor(dbName: string = DB_NAME) {
    this.dbPromise =
      typeof indexedDB === 'undefined'
        ? null
        : openDB(dbName, 1, {
            upgrade(db) {
              if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                db.createObjectStore(QUEUE_STORE, {
                  keyPath: 'seq',
                  autoIncrement: true,
                });
              }
              if (!db.objectStoreNames.contains(IDMAP_STORE)) {
                db.createObjectStore(IDMAP_STORE);
              }
            },
          });
  }

  async enqueue(cmd: Command): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    await db.add(QUEUE_STORE, cmd);
  }

  async all(): Promise<StoredCommand[]> {
    const db = await this.dbPromise;
    if (!db) return [];
    return (await db.getAll(QUEUE_STORE)) as StoredCommand[];
  }

  async remove(seq: number): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    await db.delete(QUEUE_STORE, seq);
  }

  async size(): Promise<number> {
    const db = await this.dbPromise;
    if (!db) return 0;
    return db.count(QUEUE_STORE);
  }

  async mapId(clientId: string, realId: string): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    await db.put(IDMAP_STORE, realId, clientId);
  }

  async resolveRef(ref: string): Promise<string> {
    const db = await this.dbPromise;
    if (!db) return ref;
    return ((await db.get(IDMAP_STORE, ref)) as string | undefined) ?? ref;
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    await db.clear(QUEUE_STORE);
    await db.clear(IDMAP_STORE);
  }
}
