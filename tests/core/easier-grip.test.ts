import { describe, expect, it } from 'vitest'
import { resolveDiagram } from '../../src/core/index'

/**
 * A minor barre with every flat third raised one fret is the major chord
 * on the same strings. C#m x46654 becomes C# x46664. That grip is complete
 * and easier than sliding the open C up one fret (x43121, a four-fret stretch).
 * The same pair is checked for 7/m7, 6/m6 and 7(9)/m9.
 */
const OPEN_PC = [4, 9, 2, 7, 11, 4]
const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const PAIRS: { major: string; minor: string; allowed: number[]; required: number[] }[] = [
  { major: '', minor: 'm', allowed: [0, 4, 7], required: [4] },
  { major: '7', minor: 'm7', allowed: [0, 4, 7, 10], required: [4, 10] },
  { major: '6', minor: 'm6', allowed: [0, 4, 7, 9], required: [4, 9] },
  { major: '7(9)', minor: 'm9', allowed: [0, 4, 7, 10, 2], required: [10, 2] },
]

type Slot = number | 'x'

function mod(n: number): number {
  return ((n % 12) + 12) % 12
}

function fretsOf(token: string): Slot[] | null {
  const hit = resolveDiagram({ token, instrument: 'guitar' })
  if (hit.class !== 'hit' || !hit.voicing.frets) return null
  return hit.voicing.frets
}

function fingersOf(frets: readonly Slot[]): number {
  const played: { s: number; f: number }[] = []
  frets.forEach((fret, string) => {
    if (typeof fret === 'number' && fret > 0) played.push({ s: string, f: fret })
  })
  if (played.length === 0) return 0
  let minFret = played[0]?.f ?? 0
  for (const note of played) if (note.f < minFret) minFret = note.f
  const atMin = played.filter((note) => note.f === minFret)
  let barre = atMin.length >= 2
  if (barre) {
    let lo = atMin[0]?.s ?? 0
    let hi = lo
    for (const note of atMin) {
      if (note.s < lo) lo = note.s
      if (note.s > hi) hi = note.s
    }
    for (let string = lo; string <= hi; string++) {
      const fret = frets[string]
      if (typeof fret !== 'number' || fret < minFret) {
        barre = false
        break
      }
    }
  }
  if (!barre) return played.length
  return 1 + played.filter((note) => note.f > minFret).length
}

function hand(frets: readonly Slot[], rootPc: number) {
  let spanLo = 99
  let spanHi = 0
  let fretted = false
  let sounding = 0
  let minMidi = Infinity
  let lowest = -1
  const rel = new Set<number>()
  frets.forEach((fret, string) => {
    if (fret === 'x') return
    sounding++
    const midi = [40, 45, 50, 55, 59, 64][string]! + fret
    const pc = mod(OPEN_PC[string]! + fret)
    rel.add(mod(pc - rootPc))
    if (midi < minMidi) {
      minMidi = midi
      lowest = pc
    }
    if (fret > 0) {
      fretted = true
      if (fret < spanLo) spanLo = fret
      if (fret > spanHi) spanHi = fret
    }
  })
  return {
    fingers: fingersOf(frets),
    span: fretted ? spanHi - spanLo : 0,
    sounding,
    lowest,
    rel,
  }
}

/** Minor grip with each flat third moved up one fret. Null when a fret would leave 0–9. */
function raisedThird(minor: readonly Slot[], rootPc: number): Slot[] | null {
  const next: Slot[] = []
  for (let string = 0; string < minor.length; string++) {
    const fret = minor[string] ?? 'x'
    if (fret === 'x') {
      next.push('x')
      continue
    }
    const rel = mod(mod(OPEN_PC[string]! + fret) - rootPc)
    if (rel !== 3) {
      next.push(fret)
      continue
    }
    if (fret + 1 > 9) return null
    next.push(fret + 1)
  }
  return next
}

describe('easier complete grip', () => {
  it('uses the minor barre with the third raised when that hand is easier', () => {
    const findings: string[] = []
    for (const pair of PAIRS) {
      for (let rootPc = 0; rootPc < ROOTS.length; rootPc++) {
        const root = ROOTS[rootPc] ?? 'C'
        const major = fretsOf(`${root}${pair.major}`)
        const minor = fretsOf(`${root}${pair.minor}`)
        if (!major || !minor) continue
        const raised = raisedThird(minor, rootPc)
        if (!raised) continue
        const got = hand(raised, rootPc)
        const cur = hand(major, rootPc)
        const complete =
          got.lowest === rootPc &&
          got.rel.has(0) &&
          pair.required.every((tone) => got.rel.has(tone)) &&
          [...got.rel].every((tone) => pair.allowed.includes(tone))
        const easier = got.span < cur.span && got.fingers <= cur.fingers && got.sounding >= cur.sounding - 1
        if (!complete || !easier) continue
        findings.push(
          `${root}${pair.major} ${major.join('')} is a ${cur.span}-fret stretch; ${root}${pair.minor} with the third raised is ${raised.join('')}`,
        )
      }
    }
    expect(findings).toEqual([])
  })

  it('keeps C# on the C#m barre, with the third on the 6th fret', () => {
    const hit = resolveDiagram({ token: 'C#', instrument: 'guitar' })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    expect(hit.voicing.frets).toEqual(['x', 4, 6, 6, 6, 4])
    const minor = resolveDiagram({ token: 'C#m', instrument: 'guitar' })
    expect(minor.class).toBe('hit')
    if (minor.class !== 'hit') return
    expect(minor.voicing.frets).toEqual(['x', 4, 6, 6, 5, 4])
  })
})
