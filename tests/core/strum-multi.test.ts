import { describe, expect, it } from 'vitest'
import {
  formatTitanStrum,
  parseTitanStrum,
  patternFromCc,
} from '../../src/core/strum'
import {
  formatTitanStrumSet,
  metaFromStrumSet,
  parseTitanStrumSet,
  type StrumPatternSet,
} from '../../src/core/strum-multi'
import {
  applyCifraClubEnrich,
  convert,
  proposeCifraClubEnrich,
  readMeta,
  readStrumPatterns,
  writeStrumPatterns,
} from '../../src/core/import-chordpro'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const helpers = join(dirname(fileURLToPath(import.meta.url)), '../helpers')
const CEU_AZUL = readFileSync(join(helpers, 'cifraclub-ceu-azul-strum.html'), 'utf8')

function twoPatterns(): StrumPatternSet {
  const a = patternFromCc(
    [7, 23, 23, 23, 7, 23, 23, 23, 23, 23, 19, 23, 0, 23, 19, 23],
    ['1', 'x', 'x', 'x', '2', 'x', 'x', 'x', '3', 'x', 'x', 'x', '4', 'x', 'x', 'x'],
    120,
    'Parte 1',
  )
  const b = patternFromCc(
    [23, 23, 19, 23, 7, 23, 23, 23, 7, 23, 19, 23, 7, 23, 7, 19],
    ['1', 'x', 'x', 'x', '2', 'x', 'x', 'x', '3', 'x', 'x', 'x', '4', 'x', 'x', 'x'],
    120,
    'Parte 2',
  )
  return { activeIndex: 0, patterns: [a, b] }
}

describe('single {x_titan_strum:} parses', () => {
  it('parseTitanStrum unchanged for a lone pattern string', () => {
    const raw = 'bpm=71; meter=4/4; grid=8; label=Padrão; pat=DuDu DuDU'
    const p = parseTitanStrum(raw)
    expect(p?.bpm).toBe(71)
    expect(p?.label).toBe('Padrão')
    expect(p?.slots).toHaveLength(8)
  })

  it('readStrumPatterns promotes lone x_titan_strum to a 1-pattern set', () => {
    const src = `{title:X}\n{x_titan_strum:bpm=40;meter=4/4;grid=4;label=Old;pat=DUDU}\n[G]a\n`
    const set = readStrumPatterns(src)
    expect(set.patterns).toHaveLength(1)
    expect(set.activeIndex).toBe(0)
    expect(set.patterns[0]?.bpm).toBe(40)
    expect(set.patterns[0]?.label).toBe('Old')
  })
})

describe('x_titan_strum_set wire format', () => {
  it('round-trips N named patterns without JSON braces', () => {
    const set = twoPatterns()
    const raw = formatTitanStrumSet(set)
    expect(raw).not.toMatch(/[{}]/)
    expect(raw.startsWith('0|')).toBe(true)
    expect(raw.split('|').length).toBe(3) // index + 2 patterns
    const again = parseTitanStrumSet(raw)
    expect(again?.activeIndex).toBe(0)
    expect(again?.patterns).toHaveLength(2)
    expect(again?.patterns[0]?.label).toBe('Parte 1')
    expect(again?.patterns[1]?.label).toBe('Parte 2')
    expect(again?.patterns[0]?.slots).toEqual(set.patterns[0]?.slots)
    expect(again?.patterns[1]?.slots).toEqual(set.patterns[1]?.slots)
  })

  it('metaFromStrumSet writes only x_titan_strum when N==1', () => {
    const one: StrumPatternSet = {
      activeIndex: 0,
      patterns: [twoPatterns().patterns[0]!],
    }
    const meta = metaFromStrumSet(one)
    expect(meta.x_titan_strum).toContain('label=Parte 1')
    expect(meta.x_titan_strum_set).toBeUndefined()
  })

  it('metaFromStrumSet writes x_titan_strum (active) + x_titan_strum_set when N>1', () => {
    const set = { ...twoPatterns(), activeIndex: 1 }
    const meta = metaFromStrumSet(set)
    expect(meta.x_titan_strum).toContain('label=Parte 2')
    expect(meta.x_titan_strum_set).toBeTruthy()
    expect(meta.x_titan_strum_set!.startsWith('1|')).toBe(true)
  })

  it('writeStrumPatterns / readStrumPatterns round-trip; active mirrors x_titan_strum', () => {
    const set = { ...twoPatterns(), activeIndex: 1 }
    const src = writeStrumPatterns('{title:X}\n[G]a\n', set)
    const meta = readMeta(src)
    expect(meta.x_titan_strum).toContain('Parte 2')
    expect(meta.x_titan_strum_set).toBeTruthy()

    // Active content is whatever x_titan_strum says
    const live = parseTitanStrum(meta.x_titan_strum!)
    expect(live?.label).toBe('Parte 2')

    const read = readStrumPatterns(src)
    expect(read.patterns).toHaveLength(2)
    expect(read.activeIndex).toBe(1)
    expect(read.patterns[1]?.label).toBe('Parte 2')
    expect(formatTitanStrum(read.patterns[1]!)).toBe(meta.x_titan_strum)
  })

  it('writeStrumPatterns with N==1 omits x_titan_strum_set', () => {
    const one: StrumPatternSet = {
      activeIndex: 0,
      patterns: [twoPatterns().patterns[0]!],
    }
    const src = writeStrumPatterns('{title:X}\n[G]a\n', one)
    expect(readMeta(src).x_titan_strum_set).toBeUndefined()
    expect(readMeta(src).x_titan_strum).toContain('Parte 1')
  })

  it('writeStrumPatterns empty set clears both keys', () => {
    const withMulti = writeStrumPatterns('{title:X}\n[G]a\n', twoPatterns())
    const cleared = writeStrumPatterns(withMulti, { activeIndex: 0, patterns: [] })
    const meta = readMeta(cleared)
    expect(meta.x_titan_strum).toBeUndefined()
    expect(meta.x_titan_strum_set).toBeUndefined()
  })
})

describe('import / enrich keep all CC patterns', () => {
  it('convert Céu Azul keeps 2 patterns via x_titan_strum_set', () => {
    const r = convert(CEU_AZUL)
    const set = readStrumPatterns(r.source)
    expect(set.patterns).toHaveLength(2)
    expect(set.patterns[0]?.label).toMatch(/Parte 1/)
    expect(set.patterns[1]?.label).toMatch(/Parte 2/)
    expect(readMeta(r.source).x_titan_strum).toBeTruthy()
    expect(readMeta(r.source).x_titan_strum_set).toBeTruthy()
  })

  it('enrich fills full set when local has no batida', () => {
    const local = `{title:X}\n[G]a\n`
    const proposal = proposeCifraClubEnrich(local, CEU_AZUL)
    expect(proposal.patch.x_titan_strum).toBeTruthy()
    expect(proposal.patch.x_titan_strum_set).toBeTruthy()
    const next = applyCifraClubEnrich(local, proposal)
    expect(readStrumPatterns(next).patterns).toHaveLength(2)
  })

  it('enrich keep-local still omits batida when x_titan_strum already present', () => {
    const local = `{title:X}\n{x_titan_strum:bpm=40;meter=4/4;grid=4;label=Old;pat=DUDU}\n[G]a\n`
    const proposal = proposeCifraClubEnrich(local, CEU_AZUL)
    expect(proposal.patch.x_titan_strum).toBeUndefined()
    expect(proposal.patch.x_titan_strum_set).toBeUndefined()
  })
})
