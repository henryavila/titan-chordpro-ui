import { describe, expect, it } from 'vitest'
import { parse } from '../../src/core'
import { layoutChartFull } from '../../src/core/layout'
import { readingWords, type ReadingWord } from '../../src/vue/chart/readingWords'
import type { ChartRow } from '../../src/core/types'
import { ESCUTA, loadFixture } from '../helpers/load-fixture'

/** The chart the musician reported the collision on, in a real rehearsal. */
const SDA = ESCUTA

function rows(src: string): ChartRow[] {
  const out: ChartRow[] = []
  for (const b of layoutChartFull(parse(src), {}).blocks) {
    if (b.kind !== 'stanza' && b.kind !== 'chorus') continue
    out.push(...b.rows)
  }
  return out
}

/** The sung line containing `needle`, grouped the way reading draws it. */
function wordsFor(needle: string, src = loadFixture(SDA)): ReadingWord[] {
  const row = rows(src).find((r) => r.plain.includes(needle))
  if (!row) throw new Error(`fixture has no sung row containing "${needle}"`)
  return readingWords(row.segs)
}

const textOf = (w: ReadingWord) => w.cells.map((c) => c.text).join('')
const chordsOf = (w: ReadingWord) => w.cells.filter((c) => c.hasChord).map((c) => c.chord)

describe('a word is the unit that wraps', () => {
  it('keeps two chords inside one word together — the reported bug', () => {
    // Fixture line 12: "Eu [D]oro [G]pela  [Bm]cu[E]ra"
    const word = wordsFor('cura').find((w) => textOf(w) === 'cura')
    expect(word).toBeDefined()
    expect(chordsOf(word as ReadingWord)).toEqual(['Bm', 'E'])
    // Two columns, so each reserves its own width instead of overlapping.
    expect((word as ReadingWord).cells).toHaveLength(2)
  })

  it('never splits a word at a chord change — "mo|tivos" stays whole', () => {
    // Fixture line 21: "Ter [Em]mais [Em7/D] mo[A]tivos [Gm]pra louv[D]ar"
    const word = wordsFor('motivos').find((w) => textOf(w) === 'motivos')
    expect(word).toBeDefined()
    expect(chordsOf(word as ReadingWord)).toEqual(['Em7/D', 'A'])
  })

  it('gives a chord that lands mid-word its own column', () => {
    // Fixture line 22: "Que eu [D7]seja um [B]instru[E]mento [E]seu"
    const word = wordsFor('instrumento').find((w) => textOf(w) === 'instrumento')
    expect(word).toBeDefined()
    expect(chordsOf(word as ReadingWord)).toEqual(['B', 'E'])
    expect((word as ReadingWord).cells.map((c) => c.text)).toEqual(['instru', 'mento'])
  })

  it('holds up under a long chord name', () => {
    // Fixture line 42: "Que eu [Eb7]seja um [C]instru[Fsus4]men[F]to [F]seu".
    // Picked by harmony, not by lyric: line 22 sings the very same words.
    const row = rows(loadFixture(SDA)).find((r) => r.segs.some((s) => s.chord === 'Fsus4'))
    expect(row).toBeDefined()
    const word = readingWords((row as ChartRow).segs).find((w) => textOf(w) === 'instrumento')
    expect(word).toBeDefined()
    // Three chords inside one word, the longest of them 5 characters — each
    // still gets a column of its own.
    expect(chordsOf(word as ReadingWord)).toEqual(['C', 'Fsus4', 'F'])
    expect((word as ReadingWord).cells.map((c) => c.text)).toEqual(['instru', 'men', 'to'])
  })
})

describe('the shape reading renders', () => {
  it('breaks only at real whitespace: no cell carries a space', () => {
    for (const row of rows(loadFixture(SDA))) {
      for (const word of readingWords(row.segs)) {
        for (const c of word.cells) expect(c.text).not.toMatch(/\s/)
      }
    }
  })

  it('carries the space that followed a word as that word\'s tail', () => {
    const words = wordsFor('cura')
    const spaced = words.filter((w) => w.hasTail)
    expect(spaced.length).toBeGreaterThan(0)
    for (const w of spaced) expect(w.tail).toMatch(/^\s+$/)
  })

  it('rebuilds the line exactly — nothing added, nothing dropped', () => {
    for (const row of rows(loadFixture(SDA))) {
      const rebuilt = readingWords(row.segs)
        .map((w) => textOf(w) + w.tail)
        .join('')
      expect(rebuilt).toBe(row.plain)
    }
  })

  it('gives a chord with no text of its own a column to stand in', () => {
    // "[F7]x//" style passing chords, and two chords back to back.
    const words = readingWords([
      { chord: 'G', shape: '', hasShape: false, text: '', tight: false, loose: true },
      { chord: 'C', shape: '', hasShape: false, text: 'la', tight: false, loose: true },
    ])
    const cells = words.flatMap((w) => w.cells)
    expect(cells).toHaveLength(2)
    expect(cells[0]).toMatchObject({ chord: 'G', text: '', hasChord: true })
    expect(cells[1]).toMatchObject({ chord: 'C', text: 'la', hasChord: true })
  })

  it('carries the capo shape alongside the chord that sounds', () => {
    const [word] = readingWords([
      { chord: 'Bm', shape: 'Am', hasShape: true, text: 'cu', tight: true, loose: false },
    ])
    expect(word?.cells[0]).toMatchObject({ chord: 'Bm', shape: 'Am', hasShape: true })
  })
})
