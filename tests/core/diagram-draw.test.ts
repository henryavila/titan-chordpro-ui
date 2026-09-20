import { describe, expect, it } from 'vitest'
import { drawDiagram, resolveDiagram } from '../../src/core/index'

const AM_FRETS = ['x', 0, 2, 2, 1, 0] as const
const AM_FINGERS = ['x', 0, 2, 3, 1, 0] as const
const UKE_C = [0, 0, 0, 3] as const

describe('drawDiagram', () => {
  it('is exported from src/core/index.ts', () => {
    expect(typeof drawDiagram).toBe('function')
  })

  it('guitar capo 2 draws a capo bar and the label Capo 2', () => {
    const hit = resolveDiagram({ token: 'Am', instrument: 'guitar' })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const d = drawDiagram({ instrument: 'guitar', voicing: hit.voicing, capoFret: 2 })
    expect(d.kind).toBe('frets')
    if (d.kind !== 'frets') return
    expect(d.hasCapoBar).toBe(true)
    expect(d.capoLabel).toBe('Capo 2')
    expect(d.capoFret).toBe(2)
    expect(d.svg).toContain('Capo 2')
    expect(d.tuning).toBe('EADGBE')
    expect(d.strings).toBe(6)
  })

  it('open string in the shape sounds at the capo, not the nut', () => {
    const d = drawDiagram({
      instrument: 'guitar',
      voicing: { baseFret: 1, frets: [...AM_FRETS] },
      capoFret: 2,
    })
    expect(d.kind).toBe('frets')
    if (d.kind !== 'frets') return
    expect(d.opens).toEqual([1, 5])
    expect(d.mutes).toEqual([0])
    expect(d.opens.every((s) => !d.nutOpens.includes(s))).toBe(true)
    for (const dot of d.dots) {
      expect(dot.fret).toBeGreaterThanOrEqual(2)
      expect(dot.fret).toBe(2 + dot.relativeFret)
    }
    expect(d.dots.map((x) => [x.string, x.relativeFret])).toEqual([
      [2, 2],
      [3, 2],
      [4, 1],
    ])
  })

  it('does not draw the concert Bm voicing when the hand shape is Am under capo 2', () => {
    const am = drawDiagram({
      instrument: 'guitar',
      voicing: { baseFret: 1, frets: [...AM_FRETS] },
      capoFret: 2,
    })
    const bm = drawDiagram({
      instrument: 'guitar',
      voicing: { baseFret: 1, frets: ['x', 2, 4, 4, 3, 2] },
      capoFret: 0,
    })
    expect(am.kind).toBe('frets')
    expect(bm.kind).toBe('frets')
    if (am.kind !== 'frets' || bm.kind !== 'frets') return
    expect(am.hasCapoBar).toBe(true)
    expect(bm.hasCapoBar).toBe(false)
    expect(am.dots.map((x) => x.relativeFret)).toEqual([2, 2, 1])
    expect(bm.dots.map((x) => x.relativeFret)).toEqual([2, 4, 4, 3, 2])
    expect(am.dots.map((x) => x.fret)).not.toEqual(bm.dots.map((x) => x.fret))
  })

  it('ukulele capo 2 also marks Capo 2 and sits opens on the capo', () => {
    const d = drawDiagram({
      instrument: 'ukulele',
      voicing: { baseFret: 1, frets: [...UKE_C] },
      capoFret: 2,
    })
    expect(d.kind).toBe('frets')
    if (d.kind !== 'frets') return
    expect(d.tuning).toBe('GCEA')
    expect(d.strings).toBe(4)
    expect(d.hasCapoBar).toBe(true)
    expect(d.capoLabel).toBe('Capo 2')
    expect(d.svg).toContain('Capo 2')
    expect(d.opens).toEqual([0, 1, 2])
    expect(d.nutOpens).toEqual([])
    expect(d.dots).toEqual([
      expect.objectContaining({ string: 3, relativeFret: 3, fret: 5 }),
    ])
  })

  it('piano ignores capoFret and lights concert keys', () => {
    const hit = resolveDiagram({ token: 'Bm', instrument: 'piano' })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const d = drawDiagram({
      instrument: 'piano',
      voicing: hit.voicing,
      capoFret: 2,
      token: 'Bm',
    })
    expect(d.kind).toBe('piano')
    if (d.kind !== 'piano') return
    expect(d.hasCapoBar).toBe(false)
    expect(d.capoLabel).toBeNull()
    expect(d.svg).not.toMatch(/Capo/)
    expect(d.lit).toEqual([11, 2, 6])
    expect(d.litNotes).toEqual(['B', 'D', 'F#'])
  })

  it('renders fingers 1-4 when present, otherwise dots only', () => {
    const withFingers = drawDiagram({
      instrument: 'guitar',
      voicing: { baseFret: 1, frets: [...AM_FRETS], fingers: [...AM_FINGERS] },
      capoFret: 0,
    })
    const dotsOnly = drawDiagram({
      instrument: 'guitar',
      voicing: { baseFret: 1, frets: [...AM_FRETS] },
      capoFret: 0,
    })
    expect(withFingers.kind).toBe('frets')
    expect(dotsOnly.kind).toBe('frets')
    if (withFingers.kind !== 'frets' || dotsOnly.kind !== 'frets') return
    expect(withFingers.fingersRendered).toBe(true)
    expect(dotsOnly.fingersRendered).toBe(false)
    expect(withFingers.dots.map((x) => x.finger)).toEqual([2, 3, 1])
    expect(dotsOnly.dots.every((x) => x.finger == null)).toBe(true)
    expect(withFingers.svg).toMatch(/>1</)
    expect(withFingers.svg).toMatch(/>2</)
    expect(withFingers.svg).toMatch(/>3</)
    expect(dotsOnly.svg).not.toMatch(/>1</)
    expect(dotsOnly.svg).not.toMatch(/>2</)
  })
})
