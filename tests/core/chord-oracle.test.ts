import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { classifyOracleName } from '../../scripts/build-chord-oracle'
import { parseChordToken } from '../../src/core/index'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const dir = join(root, 'fixtures/sda')
const tablePath = join(root, 'tests/core/chord-oracle.table.json')

const CLASSES = new Set(['parse', 'UNPARSED', 'AMBIGUOUS'])

type OracleRow = {
  name: string
  class: 'parse' | 'UNPARSED' | 'AMBIGUOUS'
  quality?: string
  bass?: string
}

/** Balanced ChordPro names; no nested `[` / `]` inside the token. */
const TOKEN = /\[([^\[\]]+)\]/g

function extractNames(src: string): Set<string> {
  const names = new Set<string>()
  TOKEN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TOKEN.exec(src))) names.add(m[1] ?? '')
  names.delete('')
  return names
}

function uniqueFromSda(): string[] {
  const names = new Set<string>()
  for (const file of readdirSync(dir).filter((n) => n.endsWith('.cho')).sort()) {
    for (const n of extractNames(readFileSync(join(dir, file), 'utf8'))) names.add(n)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

function loadTable(): OracleRow[] {
  return JSON.parse(readFileSync(tablePath, 'utf8')) as OracleRow[]
}

describe('chord oracle from fixtures/sda', () => {
  it('lists every unique bracket token extracted from the corpus', () => {
    const extracted = uniqueFromSda()
    const table = loadTable()
    expect(table.length).toBeGreaterThan(0)
    const listed = new Set(table.map((r) => r.name))
    const missing = extracted.filter((n) => !listed.has(n))
    expect(missing, `names in fixtures/sda missing from the table: ${missing.join(', ')}`).toEqual([])
    const invented = table.map((r) => r.name).filter((n) => !extracted.includes(n))
    expect(invented, `table names not extracted from fixtures/sda: ${invented.join(', ')}`).toEqual([])
  })

  it('classifies each row as parse, UNPARSED, or AMBIGUOUS', () => {
    const table = loadTable()
    const bad = table.filter((r) => !CLASSES.has(r.class) || typeof r.name !== 'string')
    expect(bad).toEqual([])
  })

  it('keeps 7+ and quote-junk as AMBIGUOUS or UNPARSED', () => {
    const table = loadTable()
    const plus = table.filter((r) => /7\+/.test(r.name))
    expect(plus.length).toBeGreaterThan(0)
    for (const row of plus) {
      expect(['AMBIGUOUS', 'UNPARSED'], row.name).toContain(row.class)
    }
    const junk = table.filter((r) => /["'’]/.test(r.name))
    expect(junk.some((r) => r.name.includes('A4"'))).toBe(true)
    for (const row of junk) {
      expect(['AMBIGUOUS', 'UNPARSED'], row.name).toContain(row.class)
    }
  })
})

describe('classifyOracleName follows parseChordToken', () => {
  const cases = [
    ['foo/bar', 'UNPARSED'],
    ['C7/xyz', 'AMBIGUOUS'],
    ['C/', 'AMBIGUOUS'],
    ['G/B', 'parse'],
    ['Dm(3b)/F#', 'parse'],
    ['D9/4', 'AMBIGUOUS'],
  ] as const

  it.each(cases)('%s class is %s and matches the parser', (name, cls) => {
    const oracle = classifyOracleName(name)
    const parsed = parseChordToken(name)
    expect(oracle.class, name).toBe(cls)
    expect(oracle.class, name).toBe(parsed.class)
    if (parsed.class === 'parse') {
      expect(oracle.quality, name).toBe(parsed.quality)
      expect(oracle.bass, name).toBe(parsed.bass)
    } else {
      expect(oracle).not.toHaveProperty('quality')
      expect(oracle).not.toHaveProperty('bass')
    }
  })
})

describe('oracle table matches parseChordToken', () => {
  it('class, quality, and bass agree for every row', () => {
    const mismatches: string[] = []
    for (const row of loadTable()) {
      const got = parseChordToken(row.name)
      const classified = classifyOracleName(row.name)
      if (got.class !== row.class) {
        mismatches.push(`${row.name}: table ${row.class} parser ${got.class}`)
      }
      if (classified.class !== row.class || classified.quality !== row.quality || classified.bass !== row.bass) {
        mismatches.push(`${row.name}: table diverges from classifyOracleName`)
      }
      if (row.class === 'parse' && got.class === 'parse') {
        if (got.quality !== row.quality) {
          mismatches.push(`${row.name}: quality table ${row.quality} parser ${got.quality}`)
        }
        if (got.bass !== row.bass) {
          mismatches.push(`${row.name}: bass table ${row.bass} parser ${got.bass}`)
        }
      }
    }
    expect(mismatches).toEqual([])
  })
})
