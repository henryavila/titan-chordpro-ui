import { describe, expect, it } from 'vitest'
import { parse, transpose } from '../../src/core/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

describe('transpose', () => {
  it('transpose +2 changes chord roots and displayKey', () => {
    const view = parse(loadFixture(JESUS_1))
    const next = transpose(view, 2)
    expect(next).not.toBe(view)
    expect(next.displayKey).toBe('A')
    expect(next.transposeSemitones).toBe(2)
    const origChords = view.sections
      .flatMap((s) => s.lines)
      .filter((l) => l.type === 'lyrics')
      .flatMap((l) => (l.type === 'lyrics' ? l.words : []))
      .map((w) => w.chord)
      .filter(Boolean)
    const nextChords = next.sections
      .flatMap((s) => s.lines)
      .filter((l) => l.type === 'lyrics')
      .flatMap((l) => (l.type === 'lyrics' ? l.words : []))
      .map((w) => w.chord)
      .filter(Boolean)
    expect(nextChords.some((c) => c !== origChords[origChords.indexOf(c)])).toBe(true)
    expect(origChords.includes('G')).toBe(true)
    expect(nextChords.includes('A')).toBe(true)
    expect(nextChords.includes('G')).toBe(false)
  })

  it('returns a new object (immutability)', () => {
    const view = parse(loadFixture(JESUS_1))
    const next = transpose(view, 1)
    expect(view.transposeSemitones).toBe(0)
    expect(next.transposeSemitones).toBe(1)
  })
})
