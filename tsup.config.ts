import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { 'core/index': 'src/core/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    splitting: false,
  },
  {
    entry: { 'pdf/index': 'src/pdf/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    splitting: false,
    external: ['jspdf'],
  },
  {
    entry: { 'slides/index': 'src/slides/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    splitting: false,
  },
  {
    entry: { 'cli/index': 'src/cli/index.ts' },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    splitting: false,
    banner: { js: '#!/usr/bin/env node' },
  },
])
