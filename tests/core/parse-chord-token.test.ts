import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseChordToken } from '../../src/core/index'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

type OracleRow = {
  name: string
  class: 'parse' | 'UNPARSED' | 'AMBIGUOUS'
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

describe('parseChordToken vs SDA oracle', () => {
  it('matches the oracle class for every fixtures/sda name', () => {
    const table = JSON.parse(
      readFileSync(join(root, 'tests/core/chord-oracle.table.json'), 'utf8'),
    ) as OracleRow[]
    const mismatches: string[] = []
    for (const row of table) {
      const got = parseChordToken(row.name).class
      if (got !== row.class) mismatches.push(`${row.name}: oracle ${row.class} parser ${got}`)
    }
    expect(mismatches).toEqual([])
  })
})
