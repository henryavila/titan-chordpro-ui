import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { previewDirPlugin } from './demo/preview-plugin'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue(), previewDirPlugin()],
  root: 'demo',
  publicDir: false,
  build: {
    rollupOptions: {
      input: {
        index: `${root}demo/index.html`,
        standalone: `${root}demo/standalone.html`,
        'standalone-lista': `${root}demo/standalone-lista.html`,
        site: `${root}demo/site.html`,
        'site-lista': `${root}demo/site-lista.html`,
      },
    },
  },
  resolve: {
    alias: {
      'titan-chordpro-ui/pdf': `${root}src/pdf/index.ts`,
      'titan-chordpro-ui/vue': `${root}src/vue/index.ts`,
      'titan-chordpro-ui': `${root}src/core/index.ts`,
    },
  },
  server: {
    fs: { allow: [root] },
    host: true,
    port: 5173,
    allowedHosts: true,
  },
})
