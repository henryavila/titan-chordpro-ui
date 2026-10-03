import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import { demoBootHtmlPlugin } from './demo/boot-html'
import { previewDirPlugin } from './demo/preview-plugin'

const root = fileURLToPath(new URL('.', import.meta.url))
/** Static demo for Cloudflare Workers (`pnpm build:pages` → `dist-demo/`). */
const pages = process.env.TITAN_PAGES === '1'

export default defineConfig({
  plugins: [
    demoBootHtmlPlugin(),
    vue(),
    previewDirPlugin(),
    ...(pages
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'script',
            includeAssets: ['pwa-192.png', 'pwa-512.png', 'apple-touch-icon.png'],
            manifest: {
              name: 'Titan ChordPro',
              short_name: 'Titan',
              description:
                'Demo da cifra ChordPro. Depois da primeira visita, abre e toca sem internet.',
              lang: 'pt-BR',
              display: 'standalone',
              background_color: '#0B0D12',
              theme_color: '#0B0D12',
              start_url: './',
              scope: './',
              icons: [
                { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: {
              globPatterns: [
                '**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff2,woff,m4a,wav,webmanifest}',
              ],
              navigateFallback: null,
              cleanupOutdatedCaches: true,
              maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
            },
          }),
        ]
      : []),
  ],
  root: 'demo',
  publicDir: pages ? 'public' : false,
  // The Worker serves the project at the host root (`*.workers.dev` / custom domain).
  base: process.env.VITE_BASE || '/',
  build: {
    outDir: pages ? '../dist-demo' : 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: `${root}demo/index.html`,
        standalone: `${root}demo/standalone.html`,
        'standalone-lista': `${root}demo/standalone-lista.html`,
        site: `${root}demo/site.html`,
        'site-lista': `${root}demo/site-lista.html`,
        media: `${root}demo/media.html`,
      },
    },
  },
  resolve: {
    alias: {
      '@henryavila/titan-chordpro-ui/pdf': `${root}src/pdf/index.ts`,
      '@henryavila/titan-chordpro-ui/bundle': `${root}src/bundle/index.ts`,
      '@henryavila/titan-chordpro-ui/slides': `${root}src/slides/index.ts`,
      '@henryavila/titan-chordpro-ui/vue': `${root}src/vue/index.ts`,
      '@henryavila/titan-chordpro-ui': `${root}src/core/index.ts`,
    },
  },
  server: {
    fs: { allow: [root] },
    host: true,
    port: 5173,
    allowedHosts: true,
  },
})
