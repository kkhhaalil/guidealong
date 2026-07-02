import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { toursPlugin } from './vite-plugin-tours.js';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    toursPlugin(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: '沿途向导',
        short_name: '沿途向导',
        description: '离线 GPS 语音导览',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1a6b5c',
        background_color: '#f5f0e6',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        additionalManifestEntries: [{ url: 'tours/index.json', revision: null }],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
