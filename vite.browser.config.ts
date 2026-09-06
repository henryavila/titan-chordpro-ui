import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('.', import.meta.url))
export default defineConfig({
  root: 'tests/browser', plugins: [vue()], publicDir: false,
  resolve: { alias: {
    'titan-chordpro-ui/pdf': `${root}src/pdf/index.ts`,
    'titan-chordpro-ui': `${root}src/core/index.ts`,
  } },
  server: { host: '127.0.0.1', port: 5187, strictPort: true, fs: { allow: [root] } },
})
