// `@cerebro/ui` importa tipos de `@cerebro/shared/client`, cujo módulo usa
// `import.meta.env` (Vite). Como `ui` não depende de Vite, declaramos o mínimo
// aqui para tipar sem trazer `vite/client` — espelha `shared/src/client/env.d.ts`.
// As interfaces mesclam com as do app consumidor (web/mobile), sem conflito.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
