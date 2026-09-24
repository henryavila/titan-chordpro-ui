import { describe, expect, it } from 'vitest'
import { drawDiagram, parseDefineDirective, resolveDiagram, type DiagramDraw, type FretDraw } from '../../src/core/index'
import { keyIndex } from '../../src/core/transpose'

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

  it('bounds a guitar define whose fret is 10000', () => {
    const d = drawDiagram({
      instrument: 'guitar',
      voicing: { baseFret: 1, frets: ['x', 10000, 2, 0, 1, 0] },
    })
    expect(d.kind).toBe('frets')
    if (d.kind !== 'frets') return
    const lines = d.svg.match(/class="diagram-fret"/g) ?? []
    expect(lines.length).toBeLessThanOrEqual(24)
    expect(lines.length).toBeGreaterThan(0)
    expect(d.svg).not.toContain('Infinity')
    expect(d.svg).not.toContain('10000')
    expect(d.svg.length).toBeLessThan(20000)
    expect(d.dots.some((dot) => dot.string === 1 || dot.fret > 24)).toBe(false)
    expect(d.mutes).toEqual([0, 1])
    expect(d.opens).toEqual([3, 5])
    expect(d.dots.map((dot) => [dot.string, dot.fret])).toEqual([
      [2, 2],
      [4, 1],
    ])
    expectDotsOnFretboard(d)
    expect(diagramDotCys(d.svg)).toHaveLength(d.dots.length)
    expect(diagramDotCys(d.svg)).not.toContain(yOf(lines.length) - 9)
  })

  it('does not hang when a fret token is hundreds of nines', () => {
    const hundreds = Number('9'.repeat(300))
    const overflow = Number('9'.repeat(400))
    expect(hundreds).toBeGreaterThan(24)
    expect(Number.isFinite(overflow)).toBe(false)
    for (const fret of [hundreds, overflow]) {
      const d = drawDiagram({
        instrument: 'guitar',
        voicing: { baseFret: 1, frets: ['x', fret, 2, 0, 1, 0] },
      })
      expect(d.kind).toBe('frets')
      if (d.kind !== 'frets') continue
      const lines = d.svg.match(/class="diagram-fret"/g) ?? []
      expect(lines.length).toBeLessThanOrEqual(24)
      expect(d.svg).toContain('<svg')
      expect(d.svg).not.toContain('Infinity')
      expect(d.dots.some((dot) => dot.string === 1 || !Number.isFinite(dot.fret) || dot.fret > 24)).toBe(false)
      expect(d.mutes).toEqual([0, 1])
      expect(d.opens).toEqual([3, 5])
      expect(diagramDotCys(d.svg)).toHaveLength(d.dots.length)
      expect(diagramDotCys(d.svg)).not.toContain(yOf(lines.length) - 9)
    }
  })

  it('does not draw a capo past the fret cap on the last fret', () => {
    const d = drawDiagram({
      instrument: 'guitar',
      voicing: { baseFret: 1, frets: [...AM_FRETS] },
      capoFret: 30,
    })
    expect(d.kind).toBe('frets')
    if (d.kind !== 'frets') return
    expect(d.hasCapoBar).toBe(false)
    expect(d.capoLabel).toBeNull()
    expect(d.svg).not.toContain('diagram-capo-bar')
    expect(d.svg).not.toMatch(/Capo/)
    expect(d.dots).toEqual([])
    expect(d.opens).toEqual([])
    expect(d.nutOpens).toEqual([])
    expect(d.mutes).toEqual([0, 1, 2, 3, 4, 5])
    expect(d.svg).not.toContain('diagram-dot')
    expect(d.svg).not.toContain('diagram-open')
    expect(d.svg.match(/class="diagram-mute"/g)).toHaveLength(6)
    const lines = d.svg.match(/class="diagram-fret"/g) ?? []
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.length).toBeLessThanOrEqual(24)
  })

  it('draws fret 24 and omits a dot past the cap', () => {
    const onCap = asFrets(
      drawDiagram({
        instrument: 'guitar',
        voicing: { baseFret: 1, frets: ['x', 24, 0, 0, 0, 0] },
      }),
    )
    expect(onCap.dots).toEqual([expect.objectContaining({ string: 1, fret: 24, relativeFret: 24 })])
    expect(onCap.svg.match(/class="diagram-fret"/g)).toHaveLength(24)
    expect(diagramDotCys(onCap.svg)).toEqual([yOf(24) - 9])

    const past = asFrets(
      drawDiagram({
        instrument: 'guitar',
        voicing: { baseFret: 1, frets: ['x', 25, 0, 0, 0, 0] },
      }),
    )
    expect(past.dots).toEqual([])
    expect(past.mutes).toEqual([0, 1])
    expect(past.opens).toEqual([2, 3, 4, 5])
    expect(past.svg).not.toContain('diagram-dot')
    expect(past.dots.some((dot) => dot.fret === 24)).toBe(false)
    const lines = past.svg.match(/class="diagram-fret"/g) ?? []
    expect(lines.length).toBeLessThanOrEqual(24)
    expect(lines.length).toBeGreaterThan(0)
  })

  it('draws capo opens clear of the filled capo bar', () => {
    const d = drawDiagram({
      instrument: 'guitar',
      voicing: { baseFret: 1, frets: [...AM_FRETS] },
      capoFret: 2,
    })
    expect(d.kind).toBe('frets')
    if (d.kind !== 'frets') return
    expect(d.hasCapoBar).toBe(true)
    expect(d.capoLabel).toBe('Capo 2')
    expect(d.svg).toContain('Capo 2')
    expect(d.svg).toContain('diagram-capo-bar')
    const bar = d.svg.match(/class="diagram-capo-bar"[^>]*\by="([\d.]+)"/)
    expect(bar?.[1]).toBeDefined()
    const barTop = Number(bar?.[1])
    const opens = [...d.svg.matchAll(/class="diagram-open"[^>]*\bcy="([\d.]+)"/g)].map((m) => Number(m[1]))
    expect(opens).toHaveLength(2)
    for (const cy of opens) {
      expect(cy + 4).toBeLessThan(barTop)
    }
  })

  it('paints finger numbers in var(--canvas), not white on the dot', () => {
    const d = drawDiagram({
      instrument: 'guitar',
      voicing: { baseFret: 1, frets: [...AM_FRETS], fingers: [...AM_FINGERS] },
      capoFret: 0,
    })
    expect(d.kind).toBe('frets')
    if (d.kind !== 'frets') return
    expect(d.svg).toContain('fill="var(--canvas)"')
    expect(d.svg).not.toContain('fill="#fff"')
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

  it('does not light keys when the piano name contains a quote', () => {
    for (const mark of ['\u0027', '\u0022', '\u2018', '\u2019', '\u201C', '\u201D']) {
      const token = `C${mark}`
      const d = drawDiagram({
        instrument: 'piano',
        voicing: { keys: [0, 4, 7] },
        token,
      })
      expect(d.kind, token).toBe('piano')
      if (d.kind !== 'piano') continue
      expect(d.lit, token).toEqual([])
      expect(d.litNotes, token).toEqual([])
    }
  })

  it('lights Caug from the leading note and its keys', () => {
    const keysOnly = parseDefineDirective('{define: Caug keys 0 4 8}')
    expect(keysOnly.class).toBe('parse')
    if (keysOnly.class !== 'parse') return
    const hit = resolveDiagram({ token: 'Caug', instrument: 'piano', overrides: [keysOnly] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const d = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: 'Caug' })
    expect(d.kind).toBe('piano')
    if (d.kind !== 'piano') return
    expect(d.lit).toEqual([0, 4, 8])
    expect(d.litNotes).toEqual(['C', 'E', 'G#'])

    const mixed = parseDefineDirective('{define: Caug frets x 3 2 1 1 0 keys 0 4 8}')
    expect(mixed.class).toBe('parse')
    if (mixed.class !== 'parse') return
    const mixedHit = resolveDiagram({ token: 'Caug', instrument: 'piano', overrides: [mixed] })
    expect(mixedHit.class).toBe('hit')
    if (mixedHit.class !== 'hit') return
    const mixedDraw = drawDiagram({ instrument: 'piano', voicing: mixedHit.voicing, token: 'Caug' })
    expect(mixedDraw.kind).toBe('piano')
    if (mixedDraw.kind !== 'piano') return
    expect(mixedDraw.litNotes).toEqual(['C', 'E', 'G#'])

    const midi = parseDefineDirective('{define: Daug keys 48 52 56}')
    expect(midi.class).toBe('parse')
    if (midi.class !== 'parse') return
    const midiHit = resolveDiagram({ token: 'Daug', instrument: 'piano', overrides: [midi] })
    expect(midiHit.class).toBe('hit')
    if (midiHit.class !== 'hit') return
    const midiDraw = drawDiagram({ instrument: 'piano', voicing: midiHit.voicing, token: 'Daug' })
    expect(midiDraw.kind).toBe('piano')
    if (midiDraw.kind !== 'piano') return
    expect(midiDraw.litNotes).toEqual(['C', 'E', 'G#'])
  })
})

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const FRET_SUFFIXES = ['', 'm', '5', '6', '6(9)', '7', '7(9)', '9', 'maj7', '7M(9)', 'm6', 'm7', 'm9', 'sus2', 'sus4', '7sus4', 'dim'] as const
const PIANO_SUFFIXES = [...FRET_SUFFIXES, 'm7(11)'] as const

function yOf(fret: number): number {
  return 28 + fret * 18
}

describe('dictionary draw grid', () => {
  it('places every guitar and ukulele hit on one fret axis at capo 0 and 2', () => {
    let drawn = 0
    for (const instrument of ['guitar', 'ukulele'] as const) {
      for (const root of ROOTS) {
        for (const suffix of FRET_SUFFIXES) {
          const token = `${root}${suffix}`
          const hit = resolveDiagram({ token, instrument })
          expect(hit.class, `${instrument} ${token}`).toBe('hit')
          if (hit.class !== 'hit' || !hit.voicing.frets) continue
          const base = Math.max(1, hit.voicing.baseFret ?? 1)
          for (const capoFret of [0, 2] as const) {
            const d = asFrets(drawDiagram({ instrument, voicing: hit.voicing, capoFret, token }))
            const mutes: number[] = []
            const opens: number[] = []
            const nutOpens: number[] = []
            const dots: { string: number; fret: number; relativeFret: number }[] = []
            hit.voicing.frets.forEach((slot, string) => {
              if (slot === 'x') {
                mutes.push(string)
                return
              }
              if (slot === 0) {
                opens.push(string)
                if (capoFret === 0) nutOpens.push(string)
                return
              }
              dots.push({ string, relativeFret: slot, fret: capoFret + (base - 1) + slot })
            })
            const label = `${instrument} ${token} capo ${capoFret}`
            expect(d.mutes, label).toEqual(mutes)
            expect(d.opens, label).toEqual(opens)
            expect(d.nutOpens, label).toEqual(nutOpens)
            expect(
              d.dots.map((dot) => ({ string: dot.string, fret: dot.fret, relativeFret: dot.relativeFret })),
              label,
            ).toEqual(dots)
            if (capoFret > 0) {
              expect(d.hasCapoBar, label).toBe(true)
              expect(d.capoLabel, label).toBe(`Capo ${capoFret}`)
              expect(d.svg, label).toContain(`Capo ${capoFret}`)
            } else {
              expect(d.hasCapoBar, label).toBe(false)
              expect(d.capoLabel, label).toBeNull()
              expect(d.svg, label).not.toMatch(/Capo/)
            }
            const maxFret = Math.max(4, d.capoFret, ...d.dots.map((dot) => dot.fret))
            const { y0, yMax } = stringYRange(d.svg)
            expect(y0, label).toBe(yOf(0))
            expect(yMax, label).toBe(yOf(maxFret))
            for (const dot of d.dots) expect(dot.fret, label).toBeLessThanOrEqual(maxFret)
            expect(diagramDotCys(d.svg), label).toEqual(d.dots.map((dot) => yOf(dot.fret) - 9))
            drawn++
          }
        }
      }
    }
    expect(drawn).toBe(17 * 12 * 2 * 2)
  })

  it('lights concert piano keys for every quality and ignores capo', () => {
    let drawn = 0
    for (const root of ROOTS) {
      const rootPc = keyIndex(root)
      expect(rootPc, root).not.toBeNull()
      if (rootPc === null) continue
      for (const suffix of PIANO_SUFFIXES) {
        const token = `${root}${suffix}`
        const hit = resolveDiagram({ token, instrument: 'piano' })
        expect(hit.class, token).toBe('hit')
        if (hit.class !== 'hit') continue
        const d = drawDiagram({ instrument: 'piano', voicing: hit.voicing, capoFret: 2, token })
        expect(d.kind, token).toBe('piano')
        if (d.kind !== 'piano') continue
        expect(d.capoFret, token).toBe(0)
        expect(d.capoLabel, token).toBeNull()
        expect(d.hasCapoBar, token).toBe(false)
        expect(d.svg, token).not.toMatch(/Capo/)
        const keys = hit.voicing.keys ?? []
        expect(d.lit, token).toEqual(keys.map((k) => ((rootPc + k) % 12 + 12) % 12))
        drawn++
      }
    }
    expect(drawn).toBe(18 * 12)
  })
})
