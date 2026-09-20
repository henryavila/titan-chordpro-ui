import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseChordToken } from '../../src/core/index'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

type OracleRow = {
  name: string
  class: 'parse' | 'UNPARSED' | 'AMBIGUOUS'
  quality?: string
  root?: string
  bass?: string
}

function expectedRoot(name: string): string | undefined {
  const body = name.split('/')[0] ?? ''
  return body.match(/^([A-G](?:#|b)?)/)?.[1]
}

function qualityOf(token: string): string | undefined {
  const r = parseChordToken(token)
  expect(r.class, token).toBe('parse')
  return r.class === 'parse' ? r.quality : undefined
}

describe('parseChordToken BR aliases', () => {
  it('maps 7M to maj7 and 7M(9) to maj9', () => {
    expect(qualityOf('C7M')).toBe('maj7')
    expect(qualityOf('C7M(9)')).toBe('maj9')
  })

  it('maps 4 and sus to sus4', () => {
    expect(qualityOf('C4')).toBe('sus4')
    expect(qualityOf('Csus')).toBe('sus4')
  })

  it('maps 9 to add9 and 2 to sus2', () => {
    expect(qualityOf('C9')).toBe('add9')
    expect(qualityOf('G2')).toBe('sus2')
  })

  it('maps 6(9), 7(9), and m7(11)', () => {
    expect(qualityOf('C6(9)')).toBe('6add9')
    expect(qualityOf('C7(9)')).toBe('9')
    expect(qualityOf('Cm7(11)')).toBe('m11')
  })

  it('sets slash bass', () => {
    const r = parseChordToken('G/B')
    expect(r.class).toBe('parse')
    expect(r).toMatchObject({ root: 'G', bass: 'B' })
  })

  it('does not guess 7+ as aug or maj7', () => {
    const r = parseChordToken('C7+')
    expect(r.class).toBe('AMBIGUOUS')
    expect(r).not.toHaveProperty('quality')
  })

  it('leaves quote junk unparsed', () => {
    expect(parseChordToken('A4"').class).toBe('UNPARSED')
  })

  it('is exported from src/core/index.ts', () => {
    expect(typeof parseChordToken).toBe('function')
  })
})

describe('parseChordToken miss honesty', () => {
  it('does not inherit Object.prototype as quality', () => {
    for (const token of ['CtoString', 'Cconstructor']) {
      const r = parseChordToken(token)
      expect(r.class, token).toBe('UNPARSED')
      expect(r, token).not.toHaveProperty('quality')
    }
  })

  it('treats slash with a non-chord body as UNPARSED', () => {
    for (const token of ['vocal/violão', 'foo/bar']) {
      const r = parseChordToken(token)
      expect(r.class, token).toBe('UNPARSED')
      expect(r, token).not.toHaveProperty('quality')
    }
  })

  it('keeps valid body and invalid bass as AMBIGUOUS', () => {
    const r = parseChordToken('C7/xyz')
    expect(r.class).toBe('AMBIGUOUS')
    expect(r).not.toHaveProperty('quality')
  })

  it('treats empty bass as AMBIGUOUS', () => {
    const r = parseChordToken('C/')
    expect(r.class).toBe('AMBIGUOUS')
    expect(r).not.toHaveProperty('quality')
  })
})

describe('parseChordToken vs SDA oracle', () => {
  it('matches the oracle class, quality, root, and bass for every fixtures/sda name', () => {
    const table = JSON.parse(
      readFileSync(join(root, 'tests/core/chord-oracle.table.json'), 'utf8'),
    ) as OracleRow[]
    const mismatches: string[] = []
    for (const row of table) {
      const got = parseChordToken(row.name)
      if (got.class !== row.class) {
        mismatches.push(`${row.name}: oracle ${row.class} parser ${got.class}`)
      }
      if (row.class === 'parse') {
        if (got.class === 'parse') {
          if (got.quality !== row.quality) {
            mismatches.push(`${row.name}: quality oracle ${row.quality} parser ${got.quality}`)
          }
          const wantRoot = row.root ?? expectedRoot(row.name)
          if (got.root !== wantRoot) {
            mismatches.push(`${row.name}: root oracle ${wantRoot} parser ${got.root}`)
          }
          if (got.bass !== row.bass) {
            mismatches.push(`${row.name}: bass oracle ${row.bass} parser ${got.bass}`)
          }
        }
      } else {
        if (row.quality !== undefined) {
          mismatches.push(`${row.name}: miss row must not have quality`)
        }
        if ('quality' in got) {
          mismatches.push(`${row.name}: miss parser result has quality`)
        }
      }
    }
    expect(mismatches).toEqual([])
  })
})
