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
        name: 'Segundo Cérebro',
        short_name: 'Cérebro',
        start_url: '/',
        display: 'standalone',
        theme_color: '#B4583A',
        background_color: '#F4F1EA',
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
