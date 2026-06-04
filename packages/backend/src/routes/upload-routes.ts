import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import { uploadResponseSchema } from '@cerebro/shared';
import multipart from '@fastify/multipart';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

interface UploadOptions {
  /** Diretório em disco onde os arquivos são gravados. */
  uploadDir: string;
  /**
   * Base pública da URL devolvida (ex.: 'https://api.exemplo.com').
   * Se ausente, deriva do protocolo/host da própria requisição.
   */
  publicBaseUrl?: string;
}

/**
 * Recebe um arquivo via multipart, grava em disco e devolve a URL pública.
 * A URL volta para POST /notes/:id/attachments como o `url` do Attachment.
 * (Storage de anexos = disco do servidor — decisão do dono na Tarefa 23.)
 */
export const uploadRoutes: FastifyPluginAsyncZod<UploadOptions> = async (
  app,
  options,
) => {
  await mkdir(options.uploadDir, { recursive: true });
  await app.register(multipart, { limits: { fileSize: MAX_FILE_SIZE } });

  app.post(
    '/uploads',
    { schema: { response: { 201: uploadResponseSchema } } },
    async (req, reply) => {
      const data = await req.file();
      if (!data) {
        return reply.status(400).send({ message: 'Nenhum arquivo enviado.' });
      }

      const ext = path.extname(data.filename).toLowerCase();
      const fileName = `${randomUUID()}${ext}`;
      const dest = path.join(options.uploadDir, fileName);

      await pipeline(data.file, createWriteStream(dest));

      const base = options.publicBaseUrl ?? `${req.protocol}://${req.host}`;
      return reply.status(201).send({ url: `${base}/uploads/${fileName}` });
    },
  );
};
