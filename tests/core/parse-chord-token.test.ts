import { describe, expect, it } from 'vitest'
import { parseChordToken } from '../../src/core/index'

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

  it('maps 7+ to maj7, the same quality as 7M', () => {
    expect(qualityOf('C7+')).toBe('maj7')
    expect(qualityOf('Bb7+')).toBe('maj7')
    expect(qualityOf('F#7+')).toBe(qualityOf('F#7M'))
  })

  it('does not read a bare plus as maj7 or augmented', () => {
    expect(parseChordToken('C+').class).toBe('AMBIGUOUS')
    expect(parseChordToken('Caug').class).toBe('UNPARSED')
    expect(parseChordToken('C7+(9)').class).toBe('AMBIGUOUS')
  })

  it('ignores quotes around a chord name', () => {
    expect(qualityOf('A4"')).toBe('sus4')
    expect(qualityOf("Bm7'''")).toBe('m7')
    expect(qualityOf('A9’')).toBe('add9')
    expect(parseChordToken('C"').class).toBe('parse')
    expect(parseChordToken("'").class).toBe('UNPARSED')
    expect(parseChordToken('Cx').class).toBe('UNPARSED')
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

  it('reads slash degree as bass of the chord tonic, not the song key', () => {
    const d = parseChordToken('D9/4')
    expect(d.class).toBe('parse')
    expect(d).toMatchObject({ root: 'D', quality: 'add9', bass: 'G' })
    const g = parseChordToken('G9/4')
    expect(g.class).toBe('parse')
    expect(g).toMatchObject({ root: 'G', quality: 'add9', bass: 'C' })
  })
})

describe('parseChordToken m(3b)', () => {
  it('maps m(3b) to quality m', () => {
    const r = parseChordToken('Dm(3b)')
    expect(r.class).toBe('parse')
    expect(r).toMatchObject({ root: 'D', quality: 'm' })
    expect(r).not.toHaveProperty('bass')
  })

  it('parses Dm(3b)/F# as minor with bass F#', () => {
    const r = parseChordToken('Dm(3b)/F#')
    expect(r.class).toBe('parse')
    expect(r).toMatchObject({ root: 'D', quality: 'm', bass: 'F#' })
  })
})
