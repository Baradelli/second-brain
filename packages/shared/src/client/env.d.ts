// O cliente HTTP roda no browser (Vite), mas `@cerebro/shared` não depende de
// Vite. Esta declaração ambiente descreve o mínimo de `import.meta.env` que o
// client usa, para tipar sem trazer `vite/client`. Em node/vitest `import.meta.env`
// não existe — o fallback `?? 'http://localhost:3333'` cobre esse caso.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
