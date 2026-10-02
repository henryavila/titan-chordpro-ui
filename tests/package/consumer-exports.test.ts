import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as core from '@henryavila/titan-chordpro-ui'
import { TitanChordpro } from '@henryavila/titan-chordpro-ui/vue'
import type { TitanChordproProps, EditMode, ImageChoice, ModesProp } from '../../src/vue/public'
import { resolveEditMode } from '../../src/vue/public'

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
    expect(pkg.exports['./bundle']).toMatchObject({
      types: './dist/bundle/index.d.ts',
      import: './dist/bundle/index.js',
    })
    expect(pkg.exports['./vue/style.css']).toBe('./dist/vue/style.css')

    const typesPaths = [
      pkg.types,
      (pkg.exports['.'] as { types: string }).types,
      (pkg.exports['./pdf'] as { types: string }).types,
      (pkg.exports['./slides'] as { types: string }).types,
      (pkg.exports['./bundle'] as { types: string }).types,
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
      'buildPpsxFilename',
      'buildScoreFilename',
      'lyricsForSlides',
      'lyricsText',
      'exportLyrics',
      'exportCho',
      'exportChoFile',
      'EXPORT_MIME',
      'calcScrollSpeed',
      'adjustScrollSpeed',
      'adjustScrollMultiplier',
      'createTitanChordproController',
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
        name === 'STORE_KEYS' || name === 'EXPORT_MIME' ? 'object' : 'function',
      )
    }
    expect(core).not.toHaveProperty('createViewerController')
    expect(core).not.toHaveProperty('viewerMulStep')
    expect(core).not.toHaveProperty('buildPptxFilename')
  })

  it('bundle entry exports export and import of the offline ZIP', async () => {
    const mod = await import('@henryavila/titan-chordpro-ui/bundle')
    expect(mod.exportChartBundle).toBeTypeOf('function')
    expect(mod.importChartBundle).toBeTypeOf('function')
  })

  it('vue entry exports TitanChordpro as named and default', async () => {
    const mod = await import('@henryavila/titan-chordpro-ui/vue')
    expect(mod.TitanChordpro).toBeTypeOf('object')
    expect(mod.default).toBe(mod.TitanChordpro)
    expect(TitanChordpro).toBe(mod.TitanChordpro)
    expect(mod).not.toHaveProperty('ChordproViewer')
  })

  it('vue prop types are the host contract', () => {
    const props: TitanChordproProps = { source: '', editMode: 'local' }
    const images: ImageChoice[] = [{ file: 'a.png' }]
    const both: ModesProp = 'both'
    const persisted: EditMode = 'persisted'
    expect(props.editMode).toBe('local')
    expect(images[0]?.file).toBe('a.png')
    expect(both).toBe('both')
    expect(resolveEditMode({ modes: 'content' })).toBe('persisted')
    expect(resolveEditMode({ modes: 'both' })).toBe('local')
    expect(resolveEditMode({ editMode: persisted })).toBe('persisted')
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
    expect(dts).toMatch(/TitanChordpro/)
    expect(dts).toMatch(/TitanChordproProps/)
    expect(dts).not.toMatch(/ChordproViewer/)
    expect(dts).toMatch(/from ['"]vue['"]/)
  })

  it.skipIf(!built)('vue JS pulls CSS in, so a host import is enough', () => {
    const js = readFileSync(join(root, 'dist/vue/index.js'), 'utf8')
    expect(js).toMatch(/import ['"]\.\/style\.css['"]/)
    expect(js).toMatch(/from ['"]@henryavila\/titan-chordpro-ui['"]/)
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

  it.skipIf(!built)('core, pdf, slides and bundle type files exist', () => {
    expect(existsSync(join(root, 'dist/core/index.d.ts'))).toBe(true)
    expect(existsSync(join(root, 'dist/pdf/index.d.ts'))).toBe(true)
    expect(existsSync(join(root, 'dist/slides/index.d.ts'))).toBe(true)
    expect(existsSync(join(root, 'dist/bundle/index.d.ts'))).toBe(true)
    const bundleDts = readFileSync(join(root, 'dist/bundle/index.d.ts'), 'utf8')
    expect(bundleDts).toMatch(/exportChartBundle/)
    expect(bundleDts).toMatch(/importChartBundle/)
    const coreDts = readFileSync(join(root, 'dist/core/index.d.ts'), 'utf8')
    expect(coreDts).toMatch(/export \{/)
    expect(coreDts).toMatch(/type TitanChordproDocument/)
    expect(coreDts).not.toMatch(/type ChordProView\b|createViewerController/)
    expect(coreDts).toMatch(/type SectionKind/)
    expect(coreDts).toMatch(/THEME_VARS/)
  })

  it.skipIf(!built)('dist core, pdf and slides load as ESM', async () => {
    const coreMod = await import(pathToFileURL(join(root, 'dist/core/index.js')).href)
    expect(coreMod.parse).toBeTypeOf('function')
    expect(coreMod.listThemes()).toEqual(expect.arrayContaining(['light', 'dark', 'print']))
    const pdfMod = await import(pathToFileURL(join(root, 'dist/pdf/index.js')).href)
    expect(pdfMod.renderPdf).toBeTypeOf('function')
    expect(pdfMod.exportPdf).toBeTypeOf('function')
    const slidesMod = await import(pathToFileURL(join(root, 'dist/slides/index.js')).href)
    expect(slidesMod.renderSlja).toBeTypeOf('function')
    expect(slidesMod.exportSlja).toBeTypeOf('function')
    expect(slidesMod.renderPpsx).toBeTypeOf('function')
    expect(slidesMod.exportPpsx).toBeTypeOf('function')
    expect(slidesMod).not.toHaveProperty('renderPptx')
    expect(slidesMod).not.toHaveProperty('exportPptx')
    const bundleMod = await import(pathToFileURL(join(root, 'dist/bundle/index.js')).href)
    expect(bundleMod.exportChartBundle).toBeTypeOf('function')
    expect(bundleMod.importChartBundle).toBeTypeOf('function')
  })
})
