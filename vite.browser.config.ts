import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('.', import.meta.url))
export default defineConfig({
  root: 'tests/browser', plugins: [vue()], publicDir: false,
  resolve: { alias: {
    '@henryavila/titan-chordpro-ui/pdf': `${root}src/pdf/index.ts`,
    '@henryavila/titan-chordpro-ui/slides': `${root}src/slides/index.ts`,
    '@henryavila/titan-chordpro-ui': `${root}src/core/index.ts`,
  } },
  server: { host: '127.0.0.1', port: 5187, strictPort: true, fs: { allow: [root] } },
})
