/**
 * Slash chords. A grip counts when the bass is the lowest pitch, the hand
 * stays inside four frets, no finger sits above fret 8, and four fingers
 * are enough. Otherwise the plain chord is used and `bassIgnored` names
 * the bass the diagram left out.
 */
import { lookupDict, pianoKeysOf, type FretSlot } from './chord-dict'

export type SlashGrip = {
  frets: FretSlot[]
  bassIgnored?: string
}

const MAX_FRET = 8
const MAX_SPAN = 3
const MAX_FINGERS = 4
const MIN_SOUNDING = 3

/** Intervals the chord is named for, relative to the root. Root is added in the check. */
const REQUIRED: Record<string, number[]> = Object.create(null)
REQUIRED.major = [4]
REQUIRED.m = [3]
REQUIRED['5'] = [7]
REQUIRED['6'] = [4, 9]
REQUIRED['6add9'] = [4, 9, 2]
REQUIRED['7'] = [4, 10]
REQUIRED['9'] = [10, 2]
REQUIRED.add9 = [4, 2]
REQUIRED.maj7 = [4, 11]
REQUIRED.maj9 = [11, 2]
REQUIRED.m6 = [3, 9]
REQUIRED.m7 = [3, 10]
REQUIRED.m9 = [3, 10, 2]
REQUIRED.sus2 = [2]
REQUIRED.sus4 = [5]
REQUIRED['7sus4'] = [5, 10]
REQUIRED.dim = [3, 6]

/** String 0 is the left side of the diagram. MIDI so ukulele's re-entrant G is not the bass. */
const OPEN_MIDI = {
  guitar: [40, 45, 50, 55, 59, 64],
  ukulele: [67, 60, 64, 69],
} as const

const OPEN_PC = {
  guitar: [4, 9, 2, 7, 11, 4],
  ukulele: [7, 0, 4, 9],
} as const

function mod12(n: number): number {
  return ((n % 12) + 12) % 12
}

function fingersOf(frets: readonly FretSlot[]): number {
  const played: { s: number; f: number }[] = []
  for (let s = 0; s < frets.length; s++) {
    const f = frets[s]
    if (typeof f === 'number' && f > 0) played.push({ s, f })
  }
  if (played.length === 0) return 0
  let minF = played[0]?.f ?? 0
  for (const p of played) if (p.f < minF) minF = p.f
  const atMin = played.filter((p) => p.f === minF)
  let barre = false
  if (atMin.length >= 2) {
    let lo = atMin[0]?.s ?? 0
    let hi = lo
    for (const p of atMin) {
      if (p.s < lo) lo = p.s
      if (p.s > hi) hi = p.s
    }
    barre = true
    for (let s = lo; s <= hi; s++) {
      const f = frets[s]
      if (f === 'x' || f === undefined || f < minF) {
        barre = false
        break
      }
    }
  }
  if (!barre) return played.length
  let above = 0
  for (const p of played) if (p.f > minF) above++
  return 1 + above
}

function hamming(a: readonly FretSlot[], b: readonly FretSlot[]): number {
  let n = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++
  return n
}

/**
 * Playable bass grip, or the plain chord with `bassIgnored`.
 * Null when this instrument has no plain chord to fall back on (`m11`).
 */
export function slashGrip(
  instrument: 'guitar' | 'ukulele',
  rootPc: number,
  quality: string,
  bassPc: number,
  bassName: string,
): SlashGrip | null {
  const plain = lookupDict(instrument, rootPc, quality)
  if (!plain?.frets) return null
  const intervals = pianoKeysOf(quality)
  const required = REQUIRED[quality]
  if (!intervals || !required || !Object.hasOwn(REQUIRED, quality)) return null

  const allowed = new Set<number>()
  for (const iv of intervals) allowed.add(mod12(rootPc + iv))
  allowed.add(mod12(bassPc))

  const openMidi = OPEN_MIDI[instrument]
  const openPc = OPEN_PC[instrument]
  const strings = openMidi.length
  const plainFrets = plain.frets
  const bassStrings = instrument === 'guitar' ? [0, 1, 2] : [0, 1, 2, 3]

  let best: { frets: FretSlot[]; score: number[] } | null = null
  const acc: FretSlot[] = []

  const consider = (bassString: number, bassFret: number) => {
    let minMidi = Infinity
    let sounding = 0
    let spanLo = 99
    let spanHi = 0
    let fretted = 0
    const rel = new Set<number>()
    for (let s = 0; s < strings; s++) {
      const fret = acc[s]
      if (fret === 'x' || fret === undefined) continue
      const midi = openMidi[s] + fret
      const pc = mod12(openPc[s] + fret)
      if (!allowed.has(pc) || midi < openMidi[bassString] + bassFret) return
      if (midi < minMidi) minMidi = midi
      sounding++
      rel.add(mod12(pc - rootPc))
      if (fret > 0) {
        fretted++
        if (fret < spanLo) spanLo = fret
        if (fret > spanHi) spanHi = fret
      }
    }
    if (sounding < MIN_SOUNDING) return
    const span = fretted ? spanHi - spanLo : 0
    if (span > MAX_SPAN || (fretted > 0 && spanHi > MAX_FRET)) return
    let lowest = -1
    for (let s = 0; s < strings; s++) {
      const fret = acc[s]
      if (fret === 'x' || fret === undefined) continue
      if (openMidi[s] + fret !== minMidi) continue
      const pc = mod12(openPc[s] + fret)
      if (lowest === -1) lowest = pc
      else if (lowest !== pc) return
    }
    if (lowest !== mod12(bassPc)) return
    if (!rel.has(0)) return
    for (const tone of required) if (!rel.has(tone)) return
    const fingers = fingersOf(acc)
    if (fingers > MAX_FINGERS) return
    const frets = acc.slice()
    const score = [hamming(frets, plainFrets), span, fretted ? spanHi : 0, -sounding, fingers, bassString, bassFret]
    if (!best || less(score, best.score)) best = { frets, score }
  }

  const walk = (s: number, options: FretSlot[][], bassString: number, bassFret: number) => {
    if (s === strings) {
      consider(bassString, bassFret)
      return
    }
    const opts = options[s]
    if (!opts) return
    for (const fret of opts) {
      if (typeof fret === 'number' && fret > 0) {
        let lo = fret
        let hi = fret
        for (const prev of acc) {
          if (typeof prev !== 'number' || prev <= 0) continue
          if (prev < lo) lo = prev
          if (prev > hi) hi = prev
        }
        if (hi - lo > MAX_SPAN) continue
      }
      acc.push(fret)
      walk(s + 1, options, bassString, bassFret)
      acc.pop()
    }
  }

  for (const bassString of bassStrings) {
    for (let bassFret = 0; bassFret <= MAX_FRET; bassFret++) {
      if (mod12(openPc[bassString] + bassFret) !== mod12(bassPc)) continue
      const bassMidi = openMidi[bassString] + bassFret
      const options: FretSlot[][] = []
      for (let s = 0; s < strings; s++) {
        if (s === bassString) {
          options.push([bassFret])
          continue
        }
        const slots: FretSlot[] = ['x']
        for (let fret = 0; fret <= MAX_FRET; fret++) {
          const midi = openMidi[s] + fret
          if (midi < bassMidi) continue
          if (!allowed.has(mod12(openPc[s] + fret))) continue
          slots.push(fret)
        }
        options.push(slots)
      }
      acc.length = 0
      walk(0, options, bassString, bassFret)
    }
  }

  if (best) return { frets: best.frets }
  return { frets: [...plainFrets], bassIgnored: bassName }
}

function less(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    if (av !== bv) return av < bv
  }
  return false
}
