import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Web (desktop-first). Offline Nível 1 (captura/escrita) é configurado aqui no PWA plugin.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Ghost Brain',
        short_name: 'Ghost Brain',
        start_url: '/',
        display: 'standalone',
      },
      // A estratégia de fila offline para captura/escrita entra na Tarefa 24.
    }),
  ],
  server: { port: 5173 },
  // Testes do web são lógica pura (ex.: reducer de abas) — sem DOM, ambiente node.
  test: {
    environment: 'node',
    globals: true,
  },
});
