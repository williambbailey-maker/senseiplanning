import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Plan',
        short_name: 'Plan',
        description: 'Private project planning board',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B0B0B',
        theme_color: '#0B0B0B',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Network-first so the board is always fresh online, and the last state is readable offline.
            urlPattern: ({ url, request }) =>
              url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/export') && request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'plan-api',
              networkTimeoutSeconds: 6,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 60 },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    // `vercel dev` serves /api locally; point plain `vite` at it with PLAN_API=http://localhost:3000
    proxy: process.env.PLAN_API ? { '/api': process.env.PLAN_API } : undefined,
  },
});
