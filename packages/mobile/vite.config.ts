import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Mobile (mobile-first). Mesma base do web, shell/layout próprios para telas pequenas.
// Offline Nível 1 (captura/escrita) é especialmente importante aqui (Tarefa 24).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Segundo Cérebro',
        short_name: 'Cérebro',
        start_url: '/',
        display: 'standalone',
      },
    }),
  ],
  server: { port: 5174 },
});
