/**
 * Index of docs/features for README and CONSUMER.
 *
 * Rewrites only the span between the titan-features markers.
 * Missing markers get one block appended. VISAO, SPEC, NAMING,
 * MARCAS-X and CHANGELOG stay manual.
 *
 *   pnpm docs:build
 *   pnpm docs:check
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const FEATURE_INDEX_START = '<!-- titan-features:start -->'
export const FEATURE_INDEX_END = '<!-- titan-features:end -->'

export type FeatureDoc = {
  id: string
  title: string
  sentence: string
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export function parseFeatureDoc(markdown: string): FeatureDoc | null {
  const split = splitFrontmatter(markdown)
  if (!split) return null
  const id = readId(split.frontmatter)
  if (!id) return null
  const body = split.body.replace(/\r\n/g, '\n')
  const heading = /^#\s+(.+?)\s*$/m.exec(body)
  const title = heading?.[1]?.trim() || id
  const sentence = heading
    ? firstProseSentence(body.slice((heading.index ?? 0) + heading[0].length))
    : ''
  return { id, title, sentence }
}

export function loadFeatureDocs(dir: string): FeatureDoc[] {
  const names = readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, 'en'))
  const docs: FeatureDoc[] = []
  for (const name of names) {
    const doc = parseFeatureDoc(readFileSync(join(dir, name), 'utf8'))
    if (doc) docs.push(doc)
  }
  docs.sort((a, b) => a.id.localeCompare(b.id, 'en'))
  return docs
}

/** First sentence of the prose under the package title. */
export function firstProseSentence(afterHeading: string): string {
  const prose = afterHeading.replace(/^\s+/, '')
  if (!prose) return ''
  const paragraph = prose.split(/\n\s*\n/)[0]?.replace(/\s*\n\s*/g, ' ').trim() ?? ''
  return firstSentence(paragraph)
}

export function firstSentence(paragraph: string): string {
  let ticks = 0
  for (let i = 0; i < paragraph.length; i++) {
    const ch = paragraph[i]
    if (ch === '`') ticks += 1
    if (ticks % 2 === 0 && (ch === '.' || ch === '!' || ch === '?' || ch === '…')) {
      const next = paragraph[i + 1]
      if (next === undefined || /\s/.test(next)) return paragraph.slice(0, i + 1).trim()
    }
  }
  return paragraph.trim()
}

export function featureIndexInterior(docs: FeatureDoc[]): string {
  const items = [...docs]
    .sort((a, b) => a.id.localeCompare(b.id, 'en'))
    .map((doc) => (doc.sentence ? `- **${doc.title}.** ${doc.sentence}` : `- **${doc.title}.**`))
  const list = items.length ? `${items.join('\n')}\n` : ''
  return `\n## Na tela\n\n${list}`
}

export function featureIndexMatches(markdown: string, interior: string): boolean {
  const span = markerSpan(markdown)
  if (!span) return false
  return markdown.slice(span.start + FEATURE_INDEX_START.length, span.end) === interior
}

export function upsertFeatureIndex(markdown: string, interior: string): string {
  const span = markerSpan(markdown)
  if (span) {
    return (
      markdown.slice(0, span.start + FEATURE_INDEX_START.length) +
      interior +
      markdown.slice(span.end)
    )
  }
  return appendBlock(markdown, interior)
}

export function syncFeatureIndexes(opts: {
  featuresDir: string
  targets: string[]
  write: boolean
}): { ok: boolean; updates: { file: string; changed: boolean }[] } {
  const interior = featureIndexInterior(loadFeatureDocs(opts.featuresDir))
  const updates = opts.targets.map((file) => {
    const before = readFileSync(file, 'utf8')
    const changed = !featureIndexMatches(before, interior)
    if (changed && opts.write) writeFileSync(file, upsertFeatureIndex(before, interior))
    return { file, changed }
  })
  return { ok: updates.every((update) => !update.changed), updates }
}

function splitFrontmatter(markdown: string): { frontmatter: string; body: string } | null {
  const text = markdown.replace(/^\uFEFF/, '')
  if (!text.startsWith('---')) return null
  const nl = text.indexOf('\n')
  if (nl < 0) return null
  const rest = text.slice(nl + 1)
  const close = rest.search(/^---\s*$/m)
  if (close < 0) return null
  const frontmatter = rest.slice(0, close)
  const body = rest.slice(close).replace(/^---[^\n]*\n?/, '')
  return { frontmatter, body }
}

function readId(frontmatter: string): string | null {
  for (const line of frontmatter.split(/\r?\n/)) {
    const match = /^id:\s*(.*?)\s*$/.exec(line)
    if (!match) continue
    let value = match[1] ?? ''
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    value = value.trim()
    return value.length > 0 ? value : null
  }
  return null
}

function markerSpan(markdown: string): { start: number; end: number } | null {
  const start = markdown.indexOf(FEATURE_INDEX_START)
  if (start < 0) return null
  const end = markdown.indexOf(FEATURE_INDEX_END, start + FEATURE_INDEX_START.length)
  if (end < 0) return null
  return { start, end }
}

function appendBlock(markdown: string, interior: string): string {
  const block = `${FEATURE_INDEX_START}${interior}${FEATURE_INDEX_END}\n`
  if (markdown.length === 0) return block
  const base = markdown.endsWith('\n') ? markdown : `${markdown}\n`
  const separated = base.endsWith('\n\n') ? base : `${base}\n`
  return separated + block
}

function isCli(): boolean {
  if (process.env.VITEST) return false
  const entry = process.argv[1]
  if (!entry) return false
  return resolve(entry) === fileURLToPath(import.meta.url)
}

if (isCli()) {
  const check = process.argv.includes('--check')
  const result = syncFeatureIndexes({
    featuresDir: join(ROOT, 'docs/features'),
    targets: [join(ROOT, 'README.md'), join(ROOT, 'docs/CONSUMER.md')],
    write: !check,
  })
  if (check && !result.ok) {
    console.error('docs:check: índice diferente do que docs/features geraria.')
    for (const update of result.updates) {
      if (update.changed) console.error(`- ${update.file}`)
    }
    process.exit(1)
  }
  if (check) console.log('docs:check: ok')
  else {
    const touched = result.updates.filter((update) => update.changed)
    console.log(
      touched.length
        ? `docs:build: ${touched.map((update) => update.file).join(', ')}`
        : 'docs:build: já estava em dia',
    )
  }
}
