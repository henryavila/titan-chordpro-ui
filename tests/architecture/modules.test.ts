import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Module harness for the shape locked in
 * `projects/titan-chordpro-ui/qualidade-codigo/design.md`.
 *
 * Laws fail on any hit. Debts are frozen counts: a feature may shrink them
 * and lower the number in this file. Raising a number, or adding a file to
 * an allow-list, is the change under review — not the default way to land a feature.
 *
 * `tests/core/no-vue-in-core.test.ts` stays the named A14 gate. This file is the wider net.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const LAYERS = ['bundle', 'cli', 'core', 'pdf', 'slides', 'vue'] as const

const DICTIONARY = [
  'TitanChordproActionButton.vue',
  'TitanChordproBarButton.vue',
  'TitanChordproChartSwitch.vue',
  'TitanChordproChartIdentityFields.vue',
  'TitanChordproChip.vue',
  'TitanChordproChoicePair.vue',
  'TitanChordproDialogShell.vue',
  'TitanChordproFitHint.vue',
  'TitanChordproIconButton.vue',
  'TitanChordproListRow.vue',
  'TitanChordproRollButton.vue',
  'TitanChordproSeg.vue',
  'TitanChordproSetlistNav.vue',
  'TitanChordproSpeedHud.vue',
  'TitanChordproStepper.vue',
  'TitanChordproSwitchRow.vue',
  'TitanChordproTypePair.vue',
] as const

const SPLIT = [
  'src/core/import/plain.ts',
  'src/core/import/meta.ts',
  'src/core/import/key-rewrite.ts',
  'src/core/import/cifraclub.ts',
  'src/core/import/convert.ts',
  'src/core/notation-region.ts',
  'src/core/score-clock.ts',
  'src/core/online.ts',
  'src/vue/use/useAutoScroll.ts',
  'src/vue/use/useEditSession.ts',
  'src/vue/use/useChromeLayout.ts',
  'src/vue/use/useExport.ts',
  'src/vue/use/useNotationPrefs.ts',
  'src/vue/use/overlay/mine.ts',
  'src/vue/use/overlay/persist.ts',
  'src/vue/use/overlay/queue.ts',
  'src/vue/use/overlay/update.ts',
  'src/vue/use/overlay/codec.ts',
  'src/vue/use/block-edit/gestures.ts',
  'src/vue/use/block-edit/rows.ts',
  'src/vue/use/block-edit/selection.ts',
  'src/vue/use/block-edit/session.ts',
  'src/vue/use/block-edit/source-commands.ts',
  'src/vue/use/block-edit/types.ts',
] as const

const FACADE_IMPORTS: Array<[string, string[]]> = [
  [
    'src/vue/use/useOverlay.ts',
    ['./overlay/mine', './overlay/persist', './overlay/queue', './overlay/update'],
  ],
  [
    'src/vue/use/useBlockEdit.ts',
    [
      './block-edit/rows',
      './block-edit/gestures',
      './block-edit/selection',
      './block-edit/session',
      './block-edit/source-commands',
      './block-edit/types',
    ],
  ],
  ['src/vue/use/overlay/queue.ts', ['./codec']],
]

const DOCK_MODELS: Array<[string, string]> = [
  ['src/vue/chrome/TitanChordproPhoneDock.vue', 'PhoneDockModel'],
  ['src/vue/chrome/TitanChordproWideDock.vue', 'WideDockModel'],
  ['src/vue/chrome/TitanChordproEditDock.vue', 'EditDockModel'],
  ['src/vue/chrome/TitanChordproEditHead.vue', 'EditHeadModel'],
  ['src/vue/chrome/TitanChordproViewHead.vue', 'ViewHeadModel'],
  ['src/vue/chrome/TitanChordproMoreSheet.vue', 'MoreSheetModel'],
]

const UI_CONSUMERS = [
  'src/vue/chrome/TitanChordproPhoneDock.vue',
  'src/vue/chrome/TitanChordproWideDock.vue',
  'src/vue/chrome/TitanChordproEditDock.vue',
  'src/vue/chrome/TitanChordproViewHead.vue',
  'src/vue/chrome/TitanChordproMoreSheet.vue',
]

/** The Versão menu lives in one piece. */
const CHART_SWITCH_FILES = ['src/vue/ui/TitanChordproChartSwitch.vue']

/**
 * Line ceilings. A one-line fix that crosses the line splits the file
 * (or shrinks a neighbour and lowers that neighbour's number).
 */
const LINE_CEILING: Array<{ test: (rel: string) => boolean; max: number }> = [
  { test: (rel) => rel === 'src/core/charts.ts', max: 1538 },
  { test: (rel) => rel.startsWith('src/core/') && rel.endsWith('.ts'), max: 700 },
  { test: (rel) => rel === 'src/vue/TitanChordpro.vue', max: 3555 },
  { test: (rel) => rel === 'src/vue/use/useOverlay.ts', max: 761 },
  { test: (rel) => rel === 'src/vue/use/overlay/queue.ts', max: 634 },
  { test: (rel) => rel === 'src/vue/use/strum-sample-data.ts', max: 1171 },
  { test: (rel) => rel.startsWith('src/vue/use/') && rel.endsWith('.ts'), max: 500 },
  { test: (rel) => rel.startsWith('src/vue/ui/') && rel.endsWith('.vue'), max: 260 },
]

const VUE_PACKAGE = new Set([
  '@henryavila/titan-chordpro-ui',
  '@henryavila/titan-chordpro-ui/pdf',
  '@henryavila/titan-chordpro-ui/slides',
  '@henryavila/titan-chordpro-ui/bundle',
])

const LEGACY_NAMES = [
  'ChordproViewer',
  'createViewerController',
  'viewerMulStep',
  'VisualAdapter',
  'CpvPhoneDock',
  'CpvWideDock',
  'chordpro-content',
  'song-content',
]

type Dest =
  | { kind: 'src'; layer: string; path: string }
  | { kind: 'pkg'; spec: string }
  | { kind: 'ext'; spec: string }
  | { kind: 'node' }

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

function rel(file: string): string {
  return file.slice(root.length + 1).split('\\').join('/')
}

function read(file: string): string {
  return readFileSync(file, 'utf8')
}

function lineCount(text: string): number {
  if (text === '') return 0
  let n = 0
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') n++
  return n
}

/** Drop comments so prose like `from "this embed"` is not an import. */
function stripComments(src: string): string {
  let out = ''
  let i = 0
  type Mode = 'code' | 'line' | 'block' | 's' | 'd' | 't'
  let mode: Mode = 'code'
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (mode === 'code') {
      if (c === '/' && n === '/') {
        mode = 'line'
        i += 2
        continue
      }
      if (c === '/' && n === '*') {
        mode = 'block'
        i += 2
        continue
      }
      if (c === "'") mode = 's'
      else if (c === '"') mode = 'd'
      else if (c === '`') mode = 't'
      out += c
      i++
      continue
    }
    if (mode === 'line') {
      if (c === '\n') {
        mode = 'code'
        out += c
      }
      i++
      continue
    }
    if (mode === 'block') {
      if (c === '*' && n === '/') {
        mode = 'code'
        i += 2
        continue
      }
      if (c === '\n') out += c
      i++
      continue
    }
    out += c
    if (c === '\\') {
      out += n ?? ''
      i += 2
      continue
    }
    if ((mode === 's' && c === "'") || (mode === 'd' && c === '"') || (mode === 't' && c === '`')) mode = 'code'
    i++
  }
  return out
}

function specsIn(code: string): string[] {
  const specs: string[] = []
  for (const match of code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) specs.push(match[1]!)
  for (const match of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(match[1]!)
  for (const match of code.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)) specs.push(match[1]!)
  return specs
}

function layerOf(path: string): string {
  const parts = path.split('/')
  if (parts[0] !== 'src' || parts.length < 2) return 'outside'
  if (parts[1] !== 'vue') return parts[1]!
  if (parts.length === 2 || parts[2]!.includes('.')) return 'vue:root'
  return `vue:${parts[2]}`
}

function resolveSpec(fromRel: string, spec: string): Dest {
  if (spec.startsWith('.')) {
    const stack = fromRel.split('/').slice(0, -1)
    for (const part of spec.split('/')) {
      if (part === '' || part === '.') continue
      if (part === '..') stack.pop()
      else stack.push(part)
    }
    const path = stack.join('/')
    return { kind: 'src', layer: layerOf(path), path }
  }
  if (spec === 'vue' || spec.startsWith('vue/')) return { kind: 'ext', spec }
  if (spec.startsWith('@henryavila/')) return { kind: 'pkg', spec }
  if (spec.startsWith('node:')) return { kind: 'node' }
  return { kind: 'ext', spec }
}

function topLayer(relPath: string): string {
  return relPath.split('/')[1] ?? ''
}

function vueRuntime(dest: Dest): boolean {
  return dest.kind === 'ext' && (dest.spec === 'vue' || dest.spec.startsWith('vue/'))
}

function engineAllowed(relPath: string, spec: string): boolean {
  if (spec === 'vexflow' || spec.startsWith('vexflow/')) return relPath === 'src/vue/edit/score-draw.ts'
  if (spec === 'jspdf' || spec.startsWith('jspdf/')) return relPath.startsWith('src/pdf/')
  if (spec === 'pdfjs-dist' || spec.startsWith('pdfjs-dist/')) return relPath.startsWith('src/pdf/')
  if (spec === '@coderline/alphatab' || spec.startsWith('@coderline/alphatab/')) {
    return relPath.startsWith('src/vue/chart/') || relPath === 'src/vue/edit/ImportScoreDialog.vue'
  }
  return false
}

function layerAllows(relPath: string, dest: Dest): boolean {
  const layer = topLayer(relPath)
  if (layer === 'core') return dest.kind === 'src' && dest.layer === 'core'
  if (layer === 'pdf') {
    if (dest.kind === 'src') return dest.layer === 'pdf' || dest.layer === 'core'
    if (dest.kind === 'ext') return engineAllowed(relPath, dest.spec)
    return false
  }
  if (layer === 'slides') return dest.kind === 'src' && (dest.layer === 'slides' || dest.layer === 'core')
  if (layer === 'bundle') {
    return dest.kind === 'src' && (dest.layer === 'bundle' || dest.layer === 'core' || dest.layer === 'slides')
  }
  if (layer === 'cli') {
    if (dest.kind === 'node') return true
    return dest.kind === 'src' && ['cli', 'core', 'pdf', 'slides'].includes(dest.layer)
  }
  return true
}

function vueAllows(relPath: string, dest: Dest): string | null {
  const zone = layerOf(relPath)
  if (dest.kind === 'node') return `${relPath} imports node from the UI`
  if (dest.kind === 'src' && !dest.layer.startsWith('vue')) {
    return `${relPath} reaches ${dest.path} by relative path; UI imports core, pdf, slides and bundle through @henryavila/titan-chordpro-ui`
  }
  if (dest.kind === 'pkg' && !VUE_PACKAGE.has(dest.spec)) {
    return `${relPath} imports ${dest.spec}; UI may use the core, pdf, slides and bundle entries only`
  }
  if (dest.kind === 'ext' && !vueRuntime(dest) && !engineAllowed(relPath, dest.spec)) {
    return `${relPath} imports ${dest.spec} outside its home`
  }
  if (dest.kind !== 'src') {
    if ((zone === 'vue:ui' || zone === 'vue:icon') && dest.kind === 'pkg' && dest.spec !== '@henryavila/titan-chordpro-ui') {
      return `${relPath} is a dictionary piece and imports ${dest.spec}`
    }
    return null
  }
  if (zone === 'vue:ui' && dest.layer !== 'vue:ui' && dest.layer !== 'vue:icon') {
    return `${relPath} (ui) imports ${dest.path}`
  }
  if (zone === 'vue:icon' && dest.layer !== 'vue:icon') {
    return `${relPath} (icon) imports ${dest.path}`
  }
  if (zone === 'vue:use' && dest.path.endsWith('.vue')) {
    return `${relPath} imports the component ${dest.path}; composables stay headless`
  }
  return null
}

const srcFiles = walk(join(root, 'src')).filter((file) => /\.(ts|vue|css)$/.test(file))

function hits(check: (file: string, text: string) => string | null): string[] {
  const out: string[] = []
  for (const file of srcFiles) {
    const hit = check(file, read(file))
    if (hit) out.push(hit)
  }
  return out
}

describe('module harness', () => {
  it('src has exactly the six layers', () => {
    const found = readdirSync(join(root, 'src')).filter((name) => statSync(join(root, 'src', name)).isDirectory())
    expect(found.sort()).toEqual([...LAYERS])
  })

  it('keeps the sliced modules and the dictionary', () => {
    const missing = [...SPLIT, ...DICTIONARY.map((name) => `src/vue/ui/${name}`)].filter(
      (path) => !srcFiles.some((file) => rel(file) === path),
    )
    expect(missing, missing.join('\n')).toEqual([])
  })

  it('dictionary filenames stay unique and prefixed', () => {
    const uiDir = join(root, 'src/vue/ui')
    for (const name of readdirSync(uiDir)) {
      if (name.endsWith('.vue')) expect(name.startsWith('TitanChordpro'), name).toBe(true)
    }
    for (const name of DICTIONARY) {
      const found = srcFiles.filter((file) => file.endsWith(`/${name}`)).map(rel)
      expect(found, name).toEqual([`src/vue/ui/${name}`])
    }
  })

  it('phone and wide docks stay separate and consume the dictionary', () => {
    expect(srcFiles.some((file) => rel(file) === 'src/vue/chrome/ChromeDock.vue')).toBe(false)
    const phone = read(join(root, 'src/vue/chrome/TitanChordproPhoneDock.vue'))
    const wide = read(join(root, 'src/vue/chrome/TitanChordproWideDock.vue'))
    expect(phone).not.toMatch(/WideDock/)
    expect(wide).not.toMatch(/PhoneDock/)
    for (const path of UI_CONSUMERS) {
      expect(read(join(root, path)), path).toMatch(/from ['"]\.\.\/ui\//)
    }
  })

  it('dock props come from the bind models', () => {
    for (const [path, model] of DOCK_MODELS) {
      expect(read(join(root, path)), path).toContain(`defineProps<${model}`)
    }
  })

  it('facades keep importing the modules they were split into', () => {
    for (const [path, specs] of FACADE_IMPORTS) {
      const code = stripComments(read(join(root, path)))
      const found = specsIn(code)
      const missing = specs.filter((spec) => !found.includes(spec))
      expect(missing, `${path} dropped ${missing.join(', ')}`).toEqual([])
    }
  })

  it('import-chordpro.ts is a barrel onto src/core/import', () => {
    const text = read(join(root, 'src/core/import-chordpro.ts'))
    expect(text).not.toMatch(/\b(function|class|const|let)\b/)
    const code = stripComments(text)
    const specs = specsIn(code)
    expect(specs.length).toBeGreaterThan(0)
    expect(specs.every((spec) => spec.startsWith('./import/'))).toBe(true)
  })

  it('layers only import inward', () => {
    const bad: string[] = []
    for (const file of srcFiles) {
      if (!/\.(ts|vue)$/.test(file)) continue
      const path = rel(file)
      for (const spec of specsIn(stripComments(read(file)))) {
        const dest = resolveSpec(path, spec)
        if (!layerAllows(path, dest)) bad.push(`${path} → ${spec}`)
        if (path.startsWith('src/vue/')) {
          const why = vueAllows(path, dest)
          if (why) bad.push(why)
        }
      }
    }
    expect(bad, bad.join('\n')).toEqual([])
  })

  it('notation, vector and pdf engines stay in their homes', () => {
    const bad: string[] = []
    for (const file of srcFiles) {
      const path = rel(file)
      const code = stripComments(read(file))
      for (const spec of specsIn(code)) {
        const engine =
          spec === 'vexflow' ||
          spec.startsWith('vexflow/') ||
          spec === 'jspdf' ||
          spec.startsWith('jspdf/') ||
          spec === 'pdfjs-dist' ||
          spec.startsWith('pdfjs-dist/') ||
          spec === '@coderline/alphatab' ||
          spec.startsWith('@coderline/alphatab/')
        if (engine && !engineAllowed(path, spec)) bad.push(`${path} → ${spec}`)
      }
      if (!path.startsWith('src/pdf/') && code.includes("'pdfjs-dist'")) bad.push(`${path} mentions pdfjs-dist`)
    }
    expect(bad, bad.join('\n')).toEqual([])
  })

  it('does not emit retired names', () => {
    const bad = hits((file, text) => {
      const found = LEGACY_NAMES.filter((name) => text.includes(name))
      return found.length ? `${rel(file)}: ${found.join(', ')}` : null
    })
    expect(bad, bad.join('\n')).toEqual([])
  })

  it('stored keys use the titan-chordpro prefix', () => {
    const text = read(join(root, 'src/core/storage.ts'))
    const start = text.indexOf('export const STORE_KEYS')
    const block = text.slice(start, text.indexOf('} as const', start))
    const values = [...block.matchAll(/:\s*'([^']*)'/g)].map((match) => match[1]!)
    expect(values.length).toBeGreaterThan(0)
    const bad = values.filter((value) => !value.startsWith('titan-chordpro:'))
    expect(bad).toEqual([])
    expect(text).not.toMatch(/['"]cpv:/)
  })

  it('reading switch stays a single control', () => {
    const files = srcFiles.filter((file) => read(file).includes('data-reading-switch')).map(rel)
    expect(files).toEqual(['src/vue/ReadingSwitch.vue'])
  })

  it('chart id grammar lives in core/charts.ts', () => {
    const needle = '^[a-z0-9_][a-z0-9_-]{0,63}$'
    const files = srcFiles.filter((file) => rel(file) !== 'src/core/charts.ts' && read(file).includes(needle)).map(rel)
    expect(files).toEqual([])
  })

  it('file sizes stay under the frozen ceilings', () => {
    const over: string[] = []
    for (const file of srcFiles) {
      const path = rel(file)
      const rule = LINE_CEILING.find((item) => item.test(path))
      if (!rule) continue
      const lines = lineCount(read(file))
      if (lines > rule.max) over.push(`${path} has ${lines} lines; ceiling is ${rule.max}. Split the file, then lower the ceiling.`)
    }
    expect(over, over.join('\n')).toEqual([])
  })

  it('src does not emit cpv-', () => {
    const files = srcFiles.filter((file) => read(file).includes('cpv-')).map(rel)
    expect(files).toEqual([])
  })

  it('the Versão menu is one component', () => {
    const files = srcFiles.filter((file) => read(file).includes('data-chart-switch')).map(rel)
    expect(files).toEqual(CHART_SWITCH_FILES)
  })

  it('chart ids are minted in core/chart-id.ts', () => {
    const slug = srcFiles.filter((file) => read(file).includes('function versionSlug')).map(rel)
    expect(slug).toEqual([])
    const homes = srcFiles.filter((file) => read(file).includes('function chartIdFromLabel')).map(rel)
    expect(homes).toEqual(['src/core/chart-id.ts'])
  })

  it('vue copy does not hard-code the offline sentence', () => {
    const files = srcFiles.filter((file) => rel(file).startsWith('src/vue/') && read(file).includes('Sem internet')).map(rel)
    expect(files).toEqual([])
  })
})
