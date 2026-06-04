import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { uploadRoutes } from '../upload-routes.js';

const BOUNDARY = 'cerebroTestBoundary';

/** Monta um corpo multipart/form-data com um único arquivo. */
function fileBody(filename: string, contentType: string, content: Buffer) {
  const head = Buffer.from(
    `--${BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${BOUNDARY}--\r\n`);
  return Buffer.concat([head, content, tail]);
}

let uploadDir: string;
let app: Awaited<ReturnType<typeof build>>;

async function build(dir: string) {
  const instance = Fastify().withTypeProvider<ZodTypeProvider>();
  instance.setValidatorCompiler(validatorCompiler);
  instance.setSerializerCompiler(serializerCompiler);
  await instance.register(uploadRoutes, {
    uploadDir: dir,
    publicBaseUrl: 'http://test.local',
  });
  await instance.ready();
  return instance;
}

beforeEach(async () => {
  uploadDir = mkdtempSync(path.join(tmpdir(), 'cerebro-upload-'));
  app = await build(uploadDir);
});

afterEach(async () => {
  await app.close();
  rmSync(uploadDir, { recursive: true, force: true });
});

describe('POST /uploads', () => {
  it('salva o arquivo em disco e devolve a URL pública', async () => {
    const content = Buffer.from('conteudo-da-imagem');

    const res = await app.inject({
      method: 'POST',
      url: '/uploads',
      headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` },
      payload: fileBody('foto.png', 'image/png', content),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as { url: string };
    expect(body.url).toMatch(/^http:\/\/test\.local\/uploads\/.+\.png$/);

    // O arquivo realmente foi escrito no diretório de uploads, com o conteúdo certo.
    const files = readdirSync(uploadDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/\.png$/);
    expect(readFileSync(path.join(uploadDir, files[0]!))).toEqual(content);

    // A URL aponta para o arquivo gravado.
    expect(body.url.endsWith(files[0]!)).toBe(true);
  });

  it('gera nomes distintos para uploads diferentes', async () => {
    const inject = () =>
      app.inject({
        method: 'POST',
        url: '/uploads',
        headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` },
        payload: fileBody('foto.png', 'image/png', Buffer.from('x')),
      });

    const a = (await inject()).json() as { url: string };
    const b = (await inject()).json() as { url: string };

    expect(a.url).not.toBe(b.url);
    expect(readdirSync(uploadDir)).toHaveLength(2);
  });

  it('responde 400 quando nenhum arquivo é enviado', async () => {
    const emptyField = Buffer.from(
      `--${BOUNDARY}\r\n` +
        `Content-Disposition: form-data; name="texto"\r\n\r\n` +
        `sem arquivo\r\n` +
        `--${BOUNDARY}--\r\n`,
    );

    const res = await app.inject({
      method: 'POST',
      url: '/uploads',
      headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` },
      payload: emptyField,
    });

    expect(res.statusCode).toBe(400);
  });
});
