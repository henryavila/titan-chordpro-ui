import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'titan-chordpro-ui/pdf': `${root}src/pdf/index.ts`,
      'titan-chordpro-ui/slides': `${root}src/slides/index.ts`,
      'titan-chordpro-ui/vue': `${root}src/vue/index.ts`,
      'titan-chordpro-ui': `${root}src/core/index.ts`,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    css: true,
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30000,
  },
})
