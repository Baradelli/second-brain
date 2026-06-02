import { buildServer } from './server.js';

const port = Number(process.env.PORT ?? 3333);

buildServer()
  .then((app) => app.listen({ port, host: '0.0.0.0' }))
  .then(() => {
    console.log(`Backend on http://localhost:${port} — docs em /docs`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
