import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'
import { readFileSync } from 'fs'

// Expose package version as __APP_VERSION__ in source code
const { version: APP_VERSION } = JSON.parse(readFileSync('./package.json', 'utf-8'));
// Vitest types are auto-loaded by the test runner; no explicit import needed.

// ── HTTPS for local dev (enables GPS on LAN devices) ──────────────────────────
// Run once: mkcert 192.168.0.129 localhost 127.0.0.1
// Cert files land in the project root as:
//   192.168.0.129+2.pem  /  192.168.0.129+2-key.pem
// Set VITE_HTTPS=true in your shell to activate, e.g.:
//   VITE_HTTPS=true npm run dev
const certFile = path.resolve('192.168.0.129+2.pem');
const keyFile  = path.resolve('192.168.0.129+2-key.pem');
const useHttps = process.env.VITE_HTTPS === 'true'
    && fs.existsSync(certFile)
    && fs.existsSync(keyFile);

// Django backend target for the local dev proxy
const DJANGO_ORIGIN = process.env.VITE_DJANGO_URL || 'http://localhost:8000';

// ── Proxy rules shared between HTTP and HTTPS modes ───────────────────────────
// Vite forwards these paths to Django so media files and API calls resolve
// correctly even when the frontend is served on a different port (5173).
const proxyConfig = {
  '/api':   { target: DJANGO_ORIGIN, changeOrigin: true },
  '/media': { target: DJANGO_ORIGIN, changeOrigin: true },
  '/admin': { target: DJANGO_ORIGIN, changeOrigin: true },
};

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  // ── Vitest configuration ────────────────────────────────────────────────────
  test: {
    // Use jsdom so React components can render (document, window, etc.)
    environment: 'jsdom',
    // Import @testing-library/jest-dom matchers (toBeInTheDocument, etc.) globally
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    // Exclude node_modules from coverage
    coverage: {
      provider: 'v8',
      exclude: ['node_modules/', 'src/test/', '**/*.config.*'],
    },
  },
  server: useHttps ? {
    https: { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) },
    host: true,   // bind to 0.0.0.0 so LAN devices can reach it
    proxy: proxyConfig,
  } : { host: true, proxy: proxyConfig },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'House Construction Management System',
        short_name: 'HCMS',
        description: 'Manage construction tasks, costs, and resources on site.',
        theme_color: '#1a1a1a',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Auth endpoints must NEVER be served from cache — a stale cached
            // 401/200 response would cause phantom login failures or ghost sessions.
            urlPattern: /\/api\/v1\/auth\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
})
