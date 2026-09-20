import { describe, expect, it } from 'vitest'
import {
  drawDiagram,
  parseChordToken,
  resolveDiagram,
  type ChordDefine,
} from '../../src/core/index'
import { keyIndex } from '../../src/core/transpose'

const AM_OVERRIDE: ChordDefine = {
  name: 'Am',
  instrument: 'guitar',
  directive: 'define-guitar',
  baseFret: 1,
  frets: ['x', 0, 1, 2, 2, 0],
  fingers: ['x', 0, 1, 3, 2, 0],
}

describe('resolveDiagram', () => {
  it('is exported from src/core/index.ts', () => {
    expect(typeof resolveDiagram).toBe('function')
  })

  it('hits C7M as the maj7 voicing', () => {
    const guitar = resolveDiagram({ token: 'C7M', instrument: 'guitar' })
    expect(guitar.class).toBe('hit')
    if (guitar.class !== 'hit') return
    expect(guitar.source).toBe('dictionary')
    expect(guitar.voicing.frets).toEqual(['x', 3, 2, 0, 0, 0])
    expect(guitar.voicing.frets).toHaveLength(6)

    const piano = resolveDiagram({ token: 'C7M', instrument: 'piano' })
    expect(piano.class).toBe('hit')
    if (piano.class !== 'hit') return
    expect(piano.voicing.keys).toEqual([0, 4, 7, 11])
  })

  it('misses C7+ instead of guessing aug or maj7', () => {
    const r = resolveDiagram({ token: 'C7+', instrument: 'guitar' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('unknown-token')
  })

  it('prefers a file override over the package dictionary', () => {
    const dict = resolveDiagram({ token: 'Am', instrument: 'guitar' })
    expect(dict.class).toBe('hit')
    if (dict.class !== 'hit') return
    expect(dict.source).toBe('dictionary')
    expect(dict.voicing.frets).toEqual(['x', 0, 2, 2, 1, 0])

    const over = resolveDiagram({
      token: 'Am',
      instrument: 'guitar',
      overrides: [AM_OVERRIDE],
    })
    expect(over.class).toBe('hit')
    if (over.class !== 'hit') return
    expect(over.source).toBe('override')
    expect(over.voicing.frets).toEqual(['x', 0, 1, 2, 2, 0])
    expect(over.voicing.fingers).toEqual(['x', 0, 1, 3, 2, 0])
    expect(over.voicing.frets).not.toEqual(dict.voicing.frets)
  })

  it('matches an override by canonical quality so C7M hits a Cmaj7 define', () => {
    const def: ChordDefine = {
      name: 'Cmaj7',
      instrument: 'guitar',
      directive: 'define-guitar',
      baseFret: 1,
      frets: ['x', 3, 2, 0, 0, 3],
    }
    const r = resolveDiagram({ token: 'C7M', instrument: 'guitar', overrides: [def] })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('override')
    expect(r.voicing.frets).toEqual(['x', 3, 2, 0, 0, 3])
  })

  it('uses the guitar token as shapeName, not the concert lyric', () => {
    const shape = resolveDiagram({ token: 'Am', instrument: 'guitar' })
    const concert = resolveDiagram({ token: 'Bm', instrument: 'guitar' })
    expect(shape.class).toBe('hit')
    expect(concert.class).toBe('hit')
    if (shape.class !== 'hit' || concert.class !== 'hit') return
    expect(shape.voicing.frets).toEqual(['x', 0, 2, 2, 1, 0])
    expect(concert.voicing.frets).not.toEqual(shape.voicing.frets)
  })

  it('uses the piano token as concert', () => {
    const r = resolveDiagram({ token: 'Bm', instrument: 'piano' })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.voicing.keys).toEqual([0, 3, 7])
    expect(r.voicing.frets).toBeUndefined()
  })

  it('does not apply a guitar override to piano', () => {
    const r = resolveDiagram({
      token: 'Am',
      instrument: 'piano',
      overrides: [AM_OVERRIDE],
    })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('dictionary')
    expect(r.voicing.keys).toEqual([0, 3, 7])
  })

  it('returns one voicing per name — the lowest open', () => {
    const c = resolveDiagram({ token: 'C', instrument: 'guitar' })
    expect(c.class).toBe('hit')
    if (c.class !== 'hit') return
    expect(c.voicing.frets).toEqual(['x', 3, 2, 0, 1, 0])
    const again = resolveDiagram({ token: 'C', instrument: 'guitar' })
    expect(again).toEqual(c)
  })

  it('ships ukulele GCEA (four strings) and not baritone', () => {
    const uke = resolveDiagram({ token: 'C', instrument: 'ukulele' })
    expect(uke.class).toBe('hit')
    if (uke.class !== 'hit') return
    expect(uke.voicing.frets).toEqual([0, 0, 0, 3])
    expect(uke.voicing.frets).toHaveLength(4)
  })

  it('classifies quote junk as unknown-token', () => {
    const r = resolveDiagram({ token: 'A4"', instrument: 'guitar' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('unknown-token')
  })

  it('classifies a parsed name with no voicing as no-shape', () => {
    const r = resolveDiagram({ token: 'Cm7(11)', instrument: 'ukulele' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('no-shape')
  })

  it('does not inherit Object.prototype keys as a dictionary hit', () => {
    for (const token of ['CtoString', 'Cconstructor']) {
      const r = resolveDiagram({ token, instrument: 'guitar' })
      expect(r.class, token).toBe('miss')
      if (r.class !== 'miss') continue
      expect(r.reason, token).toBe('unknown-token')
    }
  })

  it('G/B guitar is a miss without a matching bass override', () => {
    const r = resolveDiagram({ token: 'G/B', instrument: 'guitar' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('no-shape')
  })

  it('hits G/B from {define-guitar: G/B ...}', () => {
    const def: ChordDefine = {
      name: 'G/B',
      instrument: 'guitar',
      directive: 'define-guitar',
      baseFret: 1,
      frets: ['x', 2, 0, 0, 0, 3],
    }
    const r = resolveDiagram({ token: 'G/B', instrument: 'guitar', overrides: [def] })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('override')
    expect(r.voicing.frets).toEqual(['x', 2, 0, 0, 0, 3])
  })

  it('does not match G/B against {define-guitar: G}', () => {
    const def: ChordDefine = {
      name: 'G',
      instrument: 'guitar',
      directive: 'define-guitar',
      baseFret: 1,
      frets: [3, 2, 0, 0, 0, 3],
    }
    const r = resolveDiagram({ token: 'G/B', instrument: 'guitar', overrides: [def] })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('no-shape')
  })

  it('piano override absolute keys light A C E for Am', () => {
    const def: ChordDefine = {
      name: 'Am',
      instrument: 'piano',
      directive: 'define',
      keys: [9, 0, 4],
    }
    const r = resolveDiagram({ token: 'Am', instrument: 'piano', overrides: [def] })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('override')
    const d = drawDiagram({ instrument: 'piano', voicing: r.voicing, token: 'Am' })
    expect(d.kind).toBe('piano')
    if (d.kind !== 'piano') return
    expect(d.lit.slice().sort((a, b) => a - b)).toEqual([0, 4, 9])
    expect(new Set(d.litNotes)).toEqual(new Set(['A', 'C', 'E']))
  })
})

const TUNING = {
  guitar: [4, 9, 2, 7, 11, 4],
  ukulele: [7, 0, 4, 9],
} as const

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const SUFFIXES = [
  '',
  'm',
  '5',
  '6',
  '6(9)',
  '7',
  '9',
  '7(9)',
  '7M',
  '7M(9)',
  'm6',
  'm7',
  'm9',
  'm7(11)',
  '2',
  '4',
  '7(4)',
  'dim',
  'sus2',
  'sus4',
  '7sus4',
] as const

const NEED_NINTH = new Set(['9', 'add9', 'maj9', 'm9'])
const FORBID_THIRD = new Set(['5', 'sus2', 'sus4', '7sus4'])

function pitchClasses(instrument: 'guitar' | 'ukulele', frets: Array<number | 'x'>): Set<number> {
  const open = TUNING[instrument]
  const pcs = new Set<number>()
  for (let i = 0; i < open.length; i++) {
    const fret = frets[i]
    if (fret === 'x' || fret === undefined) continue
    pcs.add((open[i] + fret) % 12)
  }
  return pcs
}

describe('dictionary quality invariant', () => {
  it('decoded pitch-class set includes characteristic tones of the quality', () => {
    const failures: string[] = []
    for (const instrument of ['guitar', 'ukulele'] as const) {
      for (const root of ROOTS) {
        for (const suf of SUFFIXES) {
          const token = `${root}${suf}`
          const parsed = parseChordToken(token)
          if (parsed.class !== 'parse') continue
          const r = resolveDiagram({ token, instrument })
          if (r.class !== 'hit' || !r.voicing.frets?.length) continue
          const rootPc = keyIndex(parsed.root)
          if (rootPc === null) continue
          const pcs = pitchClasses(instrument, r.voicing.frets)
          const q = parsed.quality
          if (NEED_NINTH.has(q) && !pcs.has((rootPc + 2) % 12)) {
            failures.push(`${instrument} ${token}: missing 9th`)
          }
          if (FORBID_THIRD.has(q) && (pcs.has((rootPc + 3) % 12) || pcs.has((rootPc + 4) % 12))) {
            failures.push(`${instrument} ${token}: 3rd on ${q}`)
          }
        }
      }
    }
    expect(failures).toEqual([])
  })
})
