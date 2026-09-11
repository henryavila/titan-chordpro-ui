import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as core from 'titan-chordpro-ui'
import { ChordproViewer } from 'titan-chordpro-ui/vue'
import type { ChordproViewerProps, ImageChoice, ModesProp } from '../../src/vue/public'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

describe('package.json is what a published consumer resolves', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    main?: string
    module?: string
    types?: string
    files?: string[]
    sideEffects?: boolean | string[]
    exports: Record<string, string | { types?: string; import?: string; default?: string }>
  }

  it('exposes core, pdf, slides and vue under dist — never src', () => {
    expect(pkg.main).toBe('./dist/core/index.js')
    expect(pkg.types).toBe('./dist/core/index.d.ts')
    expect(pkg.exports['.']).toMatchObject({
      types: './dist/core/index.d.ts',
      import: './dist/core/index.js',
    })
    expect(pkg.exports['./pdf']).toMatchObject({
      types: './dist/pdf/index.d.ts',
      import: './dist/pdf/index.js',
    })
    expect(pkg.exports['./slides']).toMatchObject({
      types: './dist/slides/index.d.ts',
      import: './dist/slides/index.js',
    })
    expect(pkg.exports['./vue']).toMatchObject({
      types: './dist/vue/index.d.ts',
      import: './dist/vue/index.js',
    })
    expect(pkg.exports['./vue/style.css']).toBe('./dist/vue/style.css')

    const typesPaths = [
      pkg.types,
      (pkg.exports['.'] as { types: string }).types,
      (pkg.exports['./pdf'] as { types: string }).types,
      (pkg.exports['./slides'] as { types: string }).types,
      (pkg.exports['./vue'] as { types: string }).types,
    ]
    for (const p of typesPaths) {
      expect(p, p).toMatch(/^\.\/dist\//)
      expect(p, p).not.toMatch(/\/src\//)
    }
  })

  it('published tarball is dist-only (src is not a consumer entry)', () => {
    expect(pkg.files).toContain('dist')
    expect(pkg.files ?? []).not.toContain('src')
  })

  it('marks CSS as a side effect so bundlers keep the theme', () => {
    expect(pkg.sideEffects).toEqual(expect.arrayContaining(['**/*.css', './dist/vue/index.js']))
  })
})

describe('SPEC §4 public API is importable from the package name', () => {
  it('core exports the functions a host actually calls', () => {
    const names = [
      'parse',
      'transpose',
      'setKey',
      'renderHtml',
      'listThemes',
      'buildChoFilename',
      'buildPdfFilename',
      'buildSljaFilename',
      'lyricsForSlides',
      'lyricsText',
      'exportLyrics',
      'exportCho',
      'calcScrollSpeed',
      'adjustScrollSpeed',
      'createViewerController',
      'STORE_KEYS',
      'overlayKey',
      'memoryStore',
      'browserStore',
      'accentVars',
      'listAccents',
      'themeCssVars',
    ] as const
    for (const name of names) {
      expect(core, name).toHaveProperty(name)
      expect((core as Record<string, unknown>)[name], name).toBeTypeOf(
        name === 'STORE_KEYS' ? 'object' : 'function',
      )
    }
  })

  it('vue entry exports ChordproViewer as named and default', async () => {
    const mod = await import('titan-chordpro-ui/vue')
    expect(mod.ChordproViewer).toBeTypeOf('object')
    expect(mod.default).toBe(mod.ChordproViewer)
    expect(ChordproViewer).toBe(mod.ChordproViewer)
  })

  it('vue prop types are the host contract', () => {
    const props: ChordproViewerProps = { source: '', modes: 'local' }
    const images: ImageChoice[] = [{ file: 'a.png' }]
    const both: ModesProp = 'both'
    expect(props.modes).toBe('local')
    expect(images[0]?.file).toBe('a.png')
    expect(both).toBe('both')
  })
})

describe('Vue binding consumes core through the package name', () => {
  it('no src/vue file reaches into src/core with a relative path', () => {
    const vueDir = join(root, 'src/vue')
    const hits: string[] = []
    for (const file of walk(vueDir)) {
      if (!/\.(ts|vue)$/.test(file)) continue
      const text = readFileSync(file, 'utf8')
      if (/from ['"]\.\.\/.*core\//.test(text) || /from ['"]\.\.\/\.\.\/core\//.test(text)) {
        hits.push(relative(root, file))
      }
    }
    expect(hits).toEqual([])
  })
})

describe('built dist (consumer tarball shape)', () => {
  const built =
    existsSync(join(root, 'dist/core/index.js')) && existsSync(join(root, 'dist/slides/index.js'))

  it.skipIf(!built)('ships vue types next to the vue JS', () => {
    expect(existsSync(join(root, 'dist/vue/index.d.ts'))).toBe(true)
    expect(existsSync(join(root, 'dist/vue/index.js'))).toBe(true)
    expect(existsSync(join(root, 'dist/vue/style.css'))).toBe(true)
    const dts = readFileSync(join(root, 'dist/vue/index.d.ts'), 'utf8')
    expect(dts).toMatch(/ChordproViewer/)
    expect(dts).toMatch(/ChordproViewerProps/)
    expect(dts).toMatch(/from ['"]vue['"]/)
  })

  it.skipIf(!built)('vue JS pulls CSS in, so a host import is enough', () => {
    const js = readFileSync(join(root, 'dist/vue/index.js'), 'utf8')
    expect(js).toMatch(/import ['"]\.\/style\.css['"]/)
    expect(js).toMatch(/from ['"]titan-chordpro-ui['"]/)
    expect(js).toMatch(/from ['"]vue['"]/)
  })

  it.skipIf(!built)('CLI is a single file — no hashed sibling chunks', () => {
    const cli = readFileSync(join(root, 'dist/cli/index.js'), 'utf8')
    expect(cli.startsWith('#!/usr/bin/env node')).toBe(true)
    expect(cli).not.toMatch(/from ['"]\.\.\/chunk-[^'"]+['"]/)
    expect(cli).not.toMatch(/from ['"]\.\/chunk-[^'"]+['"]/)
    const hashed = readdirSync(join(root, 'dist')).filter((n) =>
      /^[a-z0-9]+-[A-Z0-9]{8}\.js$/.test(n) || /^chunk-[A-Z0-9]+\.js$/.test(n),
    )
    expect(hashed).toEqual([])
  })

  it.skipIf(!built)('core, pdf and slides type files exist', () => {
    expect(existsSync(join(root, 'dist/core/index.d.ts'))).toBe(true)
    expect(existsSync(join(root, 'dist/pdf/index.d.ts'))).toBe(true)
    expect(existsSync(join(root, 'dist/slides/index.d.ts'))).toBe(true)
    const coreDts = readFileSync(join(root, 'dist/core/index.d.ts'), 'utf8')
    expect(coreDts).toMatch(/export \{/)
    expect(coreDts).toMatch(/type ChordProView/)
    expect(coreDts).toMatch(/type SectionKind/)
    expect(coreDts).toMatch(/THEME_VARS/)
  })

  it.skipIf(!built)('dist core, pdf and slides load as ESM', async () => {
    const coreMod = await import(pathToFileURL(join(root, 'dist/core/index.js')).href)
    expect(coreMod.parse).toBeTypeOf('function')
    expect(coreMod.listThemes()).toEqual(expect.arrayContaining(['light', 'dark', 'print']))
    const pdfMod = await import(pathToFileURL(join(root, 'dist/pdf/index.js')).href)
    expect(pdfMod.renderPdf).toBeTypeOf('function')
    const slidesMod = await import(pathToFileURL(join(root, 'dist/slides/index.js')).href)
    expect(slidesMod.renderSlja).toBeTypeOf('function')
    expect(slidesMod.exportSlja).toBeTypeOf('function')
  })
})
