import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // App shell offline (Offline Nível 1): precache do bundle + fallback de
      // navegação para a SPA abrir sem rede. A escrita/captura offline é tratada
      // pela fila em IndexedDB (lib/offline), não por cache de API.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'Ghost Brain',
        short_name: 'Ghost Brain',
        start_url: '/',
        display: 'standalone',
        theme_color: '#18181b',
        background_color: '#f6f6f6',
      },
    }),
  ],
  server: { port: 5174 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
