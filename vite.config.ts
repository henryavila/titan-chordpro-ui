import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  root: 'demo',
  publicDir: false,
  resolve: {
    alias: {
      'titan-chordpro-ui/pdf': `${root}src/pdf/index.ts`,
      'titan-chordpro-ui/vue': `${root}src/vue/index.ts`,
      'titan-chordpro-ui': `${root}src/core/index.ts`,
    },
  },
  server: {
    fs: { allow: [root] },
    port: 5173,
  },
})
