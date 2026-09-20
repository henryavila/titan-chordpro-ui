import { describe, expect, it } from 'vitest'
import { drawDiagram, resolveDiagram, type DiagramDraw, type FretDraw } from '../../src/core/index'

const AM_FRETS = ['x', 0, 2, 2, 1, 0] as const
const AM_FINGERS = ['x', 0, 2, 3, 1, 0] as const
const UKE_C = [0, 0, 0, 3] as const

function asFrets(d: DiagramDraw): FretDraw {
  expect(d.kind).toBe('frets')
  if (d.kind !== 'frets') throw new Error('expected frets draw')
  return d
}

function diagramDotCys(svg: string): number[] {
  return [...svg.matchAll(/class="diagram-dot"[^>]*\bcy="([\d.]+)"/g)].map((m) => Number(m[1]))
}

function stringYRange(svg: string): { y0: number; yMax: number } {
  const m = svg.match(/class="diagram-string"[^>]*y1="([\d.]+)"[^>]*y2="([\d.]+)"/)
  if (!m || m[1] === undefined || m[2] === undefined) throw new Error('missing string line')
  return { y0: Number(m[1]), yMax: Number(m[2]) }
}

/** Dots sit in one coordinate space: cy between yOf(0) and yOf(maxFret). */
function expectDotsOnFretboard(d: FretDraw): void {
  const maxFret = Math.max(4, d.capoFret, ...d.dots.map((x) => x.fret))
  const { y0, yMax } = stringYRange(d.svg)
  const padY = 28
  const fretH = 18
  const yOf = (fret: number) => padY + fret * fretH
  expect(y0).toBe(yOf(0))
  expect(yMax).toBe(yOf(maxFret))
  const cys = diagramDotCys(d.svg)
  expect(cys).toHaveLength(d.dots.length)
  for (const cy of cys) {
    expect(cy).toBeGreaterThanOrEqual(yOf(0))
    expect(cy).toBeLessThanOrEqual(yOf(maxFret))
    expect(cy).toBeGreaterThanOrEqual(y0)
    expect(cy).toBeLessThanOrEqual(yMax)
  }
}

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

  it('keeps every diagram-dot cy between yOf(0) and yOf(maxFret) for capo 0/2, uke C capo 2, and baseFret>1', () => {
    const cases: Array<{ token?: string; instrument: 'guitar' | 'ukulele'; voicing: { baseFret?: number; frets: Array<number | 'x'> }; capoFret: number }> = []
    for (const token of ['C', 'F', 'G'] as const) {
      for (const capoFret of [0, 2] as const) {
        const hit = resolveDiagram({ token, instrument: 'guitar' })
        expect(hit.class, token).toBe('hit')
        if (hit.class !== 'hit' || !hit.voicing.frets) continue
        cases.push({ token, instrument: 'guitar', voicing: { baseFret: hit.voicing.baseFret, frets: hit.voicing.frets }, capoFret })
      }
    }
    cases.push({ instrument: 'ukulele', voicing: { baseFret: 1, frets: [...UKE_C] }, capoFret: 2 })
    cases.push({
      instrument: 'guitar',
      voicing: { baseFret: 5, frets: ['x', 1, 3, 3, 2, 1] },
      capoFret: 0,
    })
    expect(cases.length).toBeGreaterThanOrEqual(8)
    for (const c of cases) {
      const d = asFrets(drawDiagram({ instrument: c.instrument, voicing: c.voicing, capoFret: c.capoFret }))
      expectDotsOnFretboard(d)
    }
  })

  it('piano capoFret field is 0 even when a capo is set', () => {
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
    expect(d.capoFret).toBe(0)
    expect(d.hasCapoBar).toBe(false)
    expect(d.lit).toEqual([11, 2, 6])
  })

  it('does not default piano root to C when token is missing', () => {
    const d = drawDiagram({
      instrument: 'piano',
      voicing: { keys: [0, 4, 7] },
      capoFret: 2,
    })
    expect(d.kind).toBe('piano')
    if (d.kind !== 'piano') return
    expect(d.capoFret).toBe(0)
    expect(d.lit).toEqual([])
    expect(d.litNotes).toEqual([])
  })
})
