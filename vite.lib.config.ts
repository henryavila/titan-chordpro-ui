import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'titan-chordpro-ui/pdf': `${root}src/pdf/index.ts`,
      'titan-chordpro-ui': `${root}src/core/index.ts`,
    },
  },
  build: {
    emptyOutDir: false,
    lib: {
      entry: `${root}src/vue/index.ts`,
      name: 'TitanChordproUiVue',
      formats: ['es'],
      fileName: () => 'vue/index.js',
    },
    cssCodeSplit: false,
    rollupOptions: {
      // VexFlow is an optional peer: a host that never shows a `{sos}` block
      // should not ship an engraver. The score layer imports it lazily and
      // falls back to the source text when it is not installed.
      external: ['vue', 'jspdf', 'vexflow', 'titan-chordpro-ui', 'titan-chordpro-ui/pdf'],
      output: {
        globals: { vue: 'Vue' },
        inlineDynamicImports: true,
        entryFileNames: 'vue/index.js',
        assetFileNames: 'vue/style.css',
      },
    },
    outDir: `${root}dist`,
    sourcemap: true,
  },
})
