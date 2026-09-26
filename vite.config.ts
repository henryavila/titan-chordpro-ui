import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { previewDirPlugin } from './demo/preview-plugin'

const root = fileURLToPath(new URL('.', import.meta.url))
/** Static demo for Cloudflare Pages (`pnpm build:pages` → `dist-demo/`). */
const pages = process.env.TITAN_PAGES === '1'

export default defineConfig({
  plugins: [vue(), previewDirPlugin()],
  root: 'demo',
  publicDir: false,
  // CF Pages serves the project at the host root (`*.pages.dev`).
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
