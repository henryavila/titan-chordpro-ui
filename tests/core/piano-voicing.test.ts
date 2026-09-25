import { describe, expect, it } from 'vitest'
import { drawDiagram, resolveDiagram } from '../../src/core/index'
import { keyIndex, noteAtSemitones } from '../../src/core/transpose'

function hit(token: string) {
  const found = resolveDiagram({ token, instrument: 'piano' })
  expect(found.class, token).toBe('hit')
  if (found.class !== 'hit') throw new Error(token)
  return found
}

function pcs(tones: { midi: number }[]): number[] {
  return tones.map((tone) => ((tone.midi % 12) + 12) % 12)
}

describe('piano inversions', () => {
  it('draws one diagram per chord tone when the cifra does not name a bass', () => {
    const c = hit('C')
    expect(c.inversions?.map((inv) => inv.label)).toEqual(['C', 'C/E', 'C/G'])
    for (const inv of c.inversions ?? []) {
      const low = Math.min(...inv.tones.map((tone) => tone.midi))
      const high = Math.max(...inv.tones.map((tone) => tone.midi))
      expect(high - low, inv.label).toBeLessThan(12)
      expect(inv.tones[0]?.midi, inv.label).toBe(low)
    }
    expect(pcs(c.inversions?.[1]?.tones ?? [])).toEqual([4, 7, 0])
  })

  it('shows the written bass and the plain chord, bass lowest on the slash', () => {
    const ce = hit('C/E')
    expect(ce.inversions?.map((inv) => inv.label)).toEqual(['C/E', 'C'])
    expect(pcs(ce.inversions?.[0]?.tones ?? [])).toEqual([4, 7, 0])
    expect(ce.inversions?.[0]?.tones.map((tone) => tone.degree)).toEqual(['3', '5', '1'])
    expect(pcs(ce.inversions?.[1]?.tones ?? [])).toEqual([0, 4, 7])

    const third = hit('G/B')
    expect(third.inversions?.map((inv) => inv.label)).toEqual(['G/B', 'G'])
    expect(pcs(third.inversions?.[0]?.tones ?? [])[0]).toBe(keyIndex('B'))
    expect(pcs(third.inversions?.[1]?.tones ?? [])[0]).toBe(keyIndex('G'))
  })

  it('adds a bass the chord did not have, and still shows the plain triad', () => {
    const em = hit('Em/D')
    expect(em.inversions?.map((inv) => inv.label)).toEqual(['Em/D', 'Em'])
    const tones = em.inversions?.[0]?.tones ?? []
    expect(tones).toHaveLength(4)
    expect(tones.map((tone) => tone.degree)).toEqual(['b7', '1', 'b3', '5'])
    expect(pcs(tones)[0]).toBe(keyIndex('D'))
    const high = Math.max(...tones.map((tone) => tone.midi))
    expect(high - (tones[0]?.midi ?? 0)).toBeLessThan(12)
    const base = em.inversions?.[1]?.tones ?? []
    expect(base).toHaveLength(3)
    expect(pcs(base)[0]).toBe(keyIndex('E'))
  })

  it('prints the ninth on the second, never an octave above the bass', () => {
    const c9 = hit('C9')
    expect(c9.inversions).toHaveLength(4)
    const root = c9.inversions?.[0]?.tones ?? []
    const ninth = root.find((tone) => tone.degree === '9')
    expect(ninth).toBeTruthy()
    expect((ninth?.midi ?? 0) - (root[0]?.midi ?? 0)).toBe(2)
    expect(root.map((tone) => tone.degree)).toEqual(['1', '9', '3', '5'])

    const dom = hit('C7(9)')
    const domRoot = dom.inversions?.[0]?.tones ?? []
    expect(domRoot.map((tone) => tone.degree)).toEqual(['1', '9', '3', '5', 'b7'])
    expect(Math.max(...domRoot.map((tone) => tone.midi)) - (domRoot[0]?.midi ?? 0)).toBeLessThan(12)

    const eleven = hit('Cm7(11)')
    const tones = eleven.inversions?.[0]?.tones ?? []
    expect(tones.some((tone) => tone.degree === '11')).toBe(true)
    expect(tones.some((tone) => tone.degree === '4')).toBe(false)
    expect(eleven.inversions).toHaveLength(6)
  })

  it('spells inversion basses the way the root is spelled', () => {
    expect(hit('Bb').inversions?.map((inv) => inv.label)).toEqual(['Bb', 'Bb/D', 'Bb/F'])
    expect(hit('F#').inversions?.map((inv) => inv.label)).toEqual(['F#', 'F#/A#', 'F#/C#'])
  })

  it('draws degrees on the keys and does not print note names', () => {
    const c = hit('C9')
    const d = drawDiagram({ instrument: 'piano', voicing: c.voicing, token: 'C9' })
    expect(d.kind).toBe('piano')
    if (d.kind !== 'piano') return
    expect(d.svg).toContain('data-degree="9"')
    expect(d.svg).toContain('data-lowest="true"')
    expect(d.svg).not.toContain('diagram-dot-note')
    expect(d.svg).not.toMatch(/>[A-G]#?</)
    const texts = [...d.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1])
    expect(texts).toEqual(['1', '9', '3', '5'])
  })
})

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const SUFFIXES = [
  '',
  'm',
  '5',
  '6',
  '6(9)',
  '7',
  '7(9)',
  '9',
  'maj7',
  '7M(9)',
  'm6',
  'm7',
  'm9',
  'sus2',
  'sus4',
  '7sus4',
  'dim',
  'm7(11)',
] as const

function rectMidis(svg: string, kind: 'white' | 'black'): number[] {
  const out: number[] = []
  for (const tag of svg.matchAll(/<rect\b([^>]*)>/g)) {
    const attrs = tag[1] ?? ''
    if (!attrs.includes(`class="diagram-piano-${kind}"`)) continue
    const midi = attrs.match(/data-midi="(\d+)"/)
    if (midi) out.push(Number(midi[1]))
  }
  return out.sort((a, b) => a - b)
}

function isWhiteMidi(midi: number): boolean {
  return [0, 2, 4, 5, 7, 9, 11].includes(((midi % 12) + 12) % 12)
}

function nextWhite(midi: number): number {
  let n = midi + 1
  while (!isWhiteMidi(n)) n++
  return n
}

/** 2 then 3, or 3 then 2. Never 2+2, never a lone black. */
function blackGroups(blacks: number[]): number[] {
  if (blacks.length === 0) return []
  const groups = [1]
  for (let i = 1; i < blacks.length; i++) {
    const gap = (blacks[i] ?? 0) - (blacks[i - 1] ?? 0)
    if (gap === 2) groups[groups.length - 1] = (groups[groups.length - 1] ?? 0) + 1
    else groups.push(1)
  }
  return groups
}

function overlayOpacity(svg: string, cls: string): number | null {
  const attrs = [...svg.matchAll(/<rect\b([^>]*)>/g)].map((m) => m[1] ?? '').find((a) => a.includes(cls))
  if (!attrs) return null
  expect(attrs, cls).toContain('fill="var(--chord)"')
  const op = Number(attrs.match(/fill-opacity="([0-9.]+)"/)?.[1])
  expect(Number.isFinite(op), cls).toBe(true)
  return op
}

function assertAccidentalPaint(svg: string, token: string) {
  const rects = [...svg.matchAll(/<rect\b([^>]*)>/g)].map((m) => m[1] ?? '')
  for (const attrs of rects) {
    const fullChord = attrs.includes('fill="var(--chord)"') && !attrs.includes('fill-opacity')
    expect(fullChord, `${token} painted a key with solid theme colour`).toBe(false)
  }
  const whiteOp = overlayOpacity(svg, 'diagram-piano-white-on')
  const blackOp = overlayOpacity(svg, 'diagram-piano-black-on')
  if (whiteOp != null && blackOp != null) {
    expect(whiteOp, `${token} white wash should be lighter than the accidental`).toBeGreaterThan(blackOp)
    expect(whiteOp - blackOp, token).toBeGreaterThanOrEqual(0.2)
  }
  const sizes = [...svg.matchAll(/class="diagram-piano-degree"[^>]*font-size="([0-9.]+)"/g)].map((m) => m[1])
  if (sizes.length > 1) expect(new Set(sizes), `${token} degree size`).toEqual(new Set(['8']))
}

function assertRealPiano(svg: string, token: string) {
  const whites = rectMidis(svg, 'white')
  const blacks = rectMidis(svg, 'black')
  expect(whites.length, token).toBeGreaterThanOrEqual(7)
  expect([0, 5, 11], token).toContain(((whites[0] ?? 0) % 12 + 12) % 12)
  for (let i = 1; i < whites.length; i++) {
    expect(whites[i], `${token} white ${i}`).toBe(nextWhite(whites[i - 1] ?? 0))
  }
  const wantBlacks: number[] = []
  const first = whites[0] ?? 0
  const last = whites[whites.length - 1] ?? 0
  for (let midi = first + 1; midi < last; midi++) {
    if (!isWhiteMidi(midi)) wantBlacks.push(midi)
  }
  expect(blacks, token).toEqual(wantBlacks)
  const groups = blackGroups(blacks)
  expect(groups.length, token).toBeGreaterThan(0)
  for (const g of groups) expect([2, 3], token).toContain(g)
  for (let i = 1; i < groups.length; i++) {
    expect(groups[i], `${token} black groups ${groups.join('+')}`).not.toBe(groups[i - 1])
  }
}

describe('piano keyboard is a real piano', () => {
  it('does not split the three black keys on D/F#', () => {
    const found = hit('D/F#')
    const d = drawDiagram({ instrument: 'piano', voicing: found.voicing, token: 'D/F#' })
    expect(d.kind).toBe('piano')
    if (d.kind !== 'piano') return
    assertRealPiano(d.svg, 'D/F#')
    assertAccidentalPaint(d.svg, 'D/F#')
    expect(d.svg).toContain('diagram-piano-white-on')
    expect(d.svg).toContain('diagram-piano-black-on')
    const whites = rectMidis(d.svg, 'white')
    expect(((whites[0] ?? 0) % 12 + 12) % 12).toBe(5)
    const groups = blackGroups(rectMidis(d.svg, 'black'))
    expect(groups[0]).toBe(3)
  })

  it('keeps the 2+3 black key pattern on every dictionary chord and inversion', () => {
    const problems: string[] = []
    let drawn = 0
    for (const root of ROOTS) {
      for (const suffix of SUFFIXES) {
        const token = `${root}${suffix}`
        const found = resolveDiagram({ token, instrument: 'piano' })
        if (found.class !== 'hit') {
          problems.push(`${token} miss`)
          continue
        }
        const frames = found.inversions?.length ? found.inversions : [{ label: token, tones: found.voicing.pianoTones ?? [] }]
        for (const inv of frames) {
          const d = drawDiagram({
            instrument: 'piano',
            voicing: { ...found.voicing, pianoTones: inv.tones },
            token,
          })
          if (d.kind !== 'piano') {
            problems.push(`${inv.label} not piano`)
            continue
          }
          try {
            assertRealPiano(d.svg, inv.label)
            assertAccidentalPaint(d.svg, inv.label)
          } catch (err) {
            problems.push(err instanceof Error ? err.message : `${inv.label} ${String(err)}`)
          }
          drawn++
        }
        for (const step of [4, 7, 10]) {
          const bass = noteAtSemitones(root, step)
          if (!bass) continue
          const slash = `${token}/${bass}`
          const slashHit = resolveDiagram({ token: slash, instrument: 'piano' })
          if (slashHit.class !== 'hit') continue
          const d = drawDiagram({ instrument: 'piano', voicing: slashHit.voicing, token: slash })
          if (d.kind !== 'piano') continue
          try {
            assertRealPiano(d.svg, slash)
            assertAccidentalPaint(d.svg, slash)
          } catch (err) {
            problems.push(err instanceof Error ? err.message : `${slash} ${String(err)}`)
          }
          drawn++
        }
      }
    }
    expect(problems, problems.join('\n')).toEqual([])
    expect(drawn).toBeGreaterThan(400)
  })
})
