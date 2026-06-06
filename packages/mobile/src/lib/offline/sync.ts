import type { CommandQueue, OfflineApi } from './types.js';

export interface SyncResult {
  synced: number;
  remaining: number;
}

/**
 * Processa a fila em ordem de inserção. Cada comando só sai da fila APÓS sucesso
 * (idempotência por remoção pós-sucesso). Na primeira falha de rede, para e mantém
 * o restante para re-tentar no próximo `online` — preserva a ordem e não perde nada.
 *
 * Reconciliação de id: ao criar uma nota offline, o `clientId` temporário é mapeado
 * para o id real devolvido pelo servidor; `editNote` resolve a ref por esse mapa.
 *
 * Premissa (Nível 1): SEM resolução de conflito — last-write-wins. Single-user,
 * janela offline curta.
 */
export async function processQueue(
  queue: CommandQueue,
  api: OfflineApi,
): Promise<SyncResult> {
  const commands = await queue.all();
  let synced = 0;

  for (const cmd of commands) {
    try {
      if (cmd.type === 'createCapture') {
        await api.createCapture(cmd.payload.text);
      } else if (cmd.type === 'createNote') {
        const note = await api.createNote({
          type: cmd.payload.noteType,
          doc: cmd.payload.doc,
          title: cmd.payload.title,
          scope: cmd.payload.scope,
          date: cmd.payload.date,
          resourceId: cmd.payload.resourceId,
        });
        await queue.mapId(cmd.payload.clientId, note.id);
      } else {
        const ref = await queue.resolveRef(cmd.payload.ref);
        await api.editNote(ref, {
          doc: cmd.payload.doc,
          title: cmd.payload.title,
          labelIds: cmd.payload.labelIds,
        });
      }
      await queue.remove(cmd.seq);
      synced++;
    } catch {
      // Falha recuperável (offline/servidor fora): mantém este e os seguintes.
      break;
    }
  }

  return { synced, remaining: await queue.size() };
}
