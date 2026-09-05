import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { 'core/index': 'src/core/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
  },
  {
    entry: { 'pdf/index': 'src/pdf/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    external: ['jspdf'],
  },
  {
    entry: { 'cli/index': 'src/cli/index.ts' },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    banner: { js: '#!/usr/bin/env node' },
  },
])
