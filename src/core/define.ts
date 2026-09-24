/**
 * ChordPro `{define}` / `{define-guitar}` / `{define-ukulele}` — file override,
 * not package dictionary. Generic `{define:}` infers instrument from payload.
 */

import { PIANO_MIDI_FLOOR, pianoKeysAreMidi } from './chord-dict'
import { transposeToken } from './transpose'

export const DIR = /^\s*\{\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*:?\s*([^}]*)\}\s*$/

export type DefineDirective = 'define' | 'define-guitar' | 'define-ukulele'
export type DefineInstrument = 'guitar' | 'ukulele' | 'piano'

export type ChordDefine = {
  name: string
  instrument: DefineInstrument
  directive: DefineDirective
  baseFret?: number
  frets?: Array<number | 'x'>
  fingers?: Array<number | 'x'>
  keys?: number[]
}

export type DefineResult = ({ class: 'parse' } & ChordDefine) | { class: 'miss' }

const KEYWORDS = new Set(['base-fret', 'frets', 'fingers', 'keys'])

export function isDefineKey(k: string): boolean {
  const x = k.toLowerCase()
  return x === 'define' || x === 'define-guitar' || x === 'define-ukulele'
}

function miss(): DefineResult {
  return { class: 'miss' }
}

function parseFret(tok: string): number | 'x' | null {
  const t = tok.toLowerCase()
  if (t === 'x' || t === '-1') return 'x'
  if (/^\d+$/.test(tok)) return Number(tok)
  return null
}

function parseFinger(tok: string): number | 'x' | null {
  const t = tok.toLowerCase()
  if (t === 'x' || t === '-') return 'x'
  if (/^\d+$/.test(tok)) return Number(tok)
  return null
}

function takeValues(tokens: string[], from: number): { vals: string[]; next: number } {
  const vals: string[] = []
  let i = from
  while (i < tokens.length && !KEYWORDS.has((tokens[i] ?? '').toLowerCase())) {
    vals.push(tokens[i] ?? '')
    i++
  }
  return { vals, next: i }
}

function fmtSlots(xs: Array<number | 'x'>): string {
  return xs.map((v) => (v === 'x' ? 'x' : String(v))).join(' ')
}

export function parseDefineDirective(raw: string): DefineResult {
  const m = String(raw ?? '').match(DIR)
  if (!m) return miss()
  const key = (m[1] ?? '').toLowerCase()
  if (!isDefineKey(key)) return miss()
  const directive = key as DefineDirective
  const body = (m[2] ?? '').trim()
  if (!body) return miss()

  const tokens = body.split(/\s+/).filter(Boolean)
  const name = tokens[0] ?? ''
  if (!name) return miss()

  let baseFret: number | undefined
  let frets: Array<number | 'x'> | undefined
  let fingers: Array<number | 'x'> | undefined
  let keys: number[] | undefined
  let i = 1
  while (i < tokens.length) {
    const kw = (tokens[i] ?? '').toLowerCase()
    if (kw === 'base-fret') {
      const n = Number(tokens[i + 1])
      if (!Number.isFinite(n) || n < 1) return miss()
      baseFret = n
      i += 2
      continue
    }
    if (kw === 'frets') {
      const { vals, next } = takeValues(tokens, i + 1)
      const parsed: Array<number | 'x'> = []
      for (const v of vals) {
        const f = parseFret(v)
        if (f === null) return miss()
        parsed.push(f)
      }
      frets = parsed
      i = next
      continue
    }
    if (kw === 'fingers') {
      const { vals, next } = takeValues(tokens, i + 1)
      const parsed: Array<number | 'x'> = []
      for (const v of vals) {
        const f = parseFinger(v)
        if (f === null) return miss()
        parsed.push(f)
      }
      fingers = parsed
      i = next
      continue
    }
    if (kw === 'keys') {
      const { vals, next } = takeValues(tokens, i + 1)
      const parsed: number[] = []
      for (const v of vals) {
        const n = Number(v)
        if (!Number.isFinite(n) || !/^-?\d+$/.test(v)) return miss()
        parsed.push(n)
      }
      keys = parsed
      i = next
      continue
    }
    return miss()
  }

  let instrument: DefineInstrument | null = null
  if (directive === 'define-guitar') {
    if (frets?.length !== 6) return miss()
    instrument = 'guitar'
  } else if (directive === 'define-ukulele') {
    if (frets?.length !== 4) return miss()
    instrument = 'ukulele'
  } else if (keys && keys.length) {
    instrument = 'piano'
  } else if (frets?.length === 6) {
    instrument = 'guitar'
  } else if (frets?.length === 4) {
    instrument = 'ukulele'
  } else {
    return miss()
  }

  if (fingers && frets && fingers.length !== frets.length) return miss()
  if (fingers && !frets?.length) return miss()

  const parsed: DefineResult = {
    class: 'parse',
    name,
    instrument,
    directive,
  }
  if (keys?.length) parsed.keys = keys
  if (frets?.length) {
    parsed.baseFret = baseFret ?? 1
    parsed.frets = frets
  }
  if (fingers) parsed.fingers = fingers
  return parsed
}

export function serializeDefine(def: ChordDefine): string {
  let body = `${def.directive}: ${def.name}`
  if (def.frets?.length) {
    body += ` base-fret ${def.baseFret ?? 1} frets ${fmtSlots(def.frets)}`
    if (def.fingers) body += ` fingers ${fmtSlots(def.fingers)}`
  }
  if (def.keys?.length) body += ` keys ${def.keys.join(' ')}`
  return `{${body}}`
}

/** Lowest key. A loop — never `Math.min(...keys)`, which throws on a long list. */
function lowestKey(keys: readonly number[]): number {
  let min = Number.POSITIVE_INFINITY
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i] ?? 0
    if (k < min) min = k
  }
  return min
}

/**
 * MIDI adds n, then every key is lifted by the same number of octaves until
 * each one is >= 48. Spacing stays. Distances are not passed here.
 */
function liftMidiToFloor(keys: readonly number[]): number[] {
  if (keys.length === 0) return []
  const min = lowestKey(keys)
  if (!Number.isFinite(min) || min >= PIANO_MIDI_FLOOR) return [...keys]
  const octaves = Math.floor((PIANO_MIDI_FLOOR - 1 - min) / 12) + 1
  const bump = octaves * 12
  const out: number[] = []
  for (let i = 0; i < keys.length; i++) out.push((keys[i] ?? 0) + bump)
  return out
}

/**
 * Distances, including a list entirely above 17 (24 28 31), stay as written.
 * MIDI (every key >= 48, or any key < 0) adds n and is lifted to >= 48.
 * Does not throw, including when the list is longer than 32.
 */
function transposePianoKeys(keys: readonly number[], n: number): number[] {
  if (!pianoKeysAreMidi(keys)) return [...keys]
  const shifted: number[] = []
  for (let i = 0; i < keys.length; i++) shifted.push((keys[i] ?? 0) + n)
  return liftMidiToFloor(shifted)
}

/**
 * Guitar/ukulele: bump `baseFret` when every slot is >0 or `x`; drop the
 * fret shape if any string is open (fret 0) or the new base would fall
 * below 1. Keys that remain become a generic piano `{define:}` — a
 * `{define-guitar:}` / `{define-ukulele:}` line without its frets does not
 * parse. Distances stay as written; only the chord name changes. MIDI
 * adds n and stays >= 48 without folding into one octave. Does not throw.
 */
export function transposeDefine(def: ChordDefine, n: number, flats: boolean): ChordDefine | null {
  if (!n) return { ...def }
  const frets = def.frets
  const hasFrets = (frets?.length ?? 0) > 0
  const hasKeys = (def.keys?.length ?? 0) > 0
  const open = frets?.some((f) => f === 0) ?? false
  const nextBase = hasFrets ? (def.baseFret ?? 1) + n : 1
  const fretsMove = hasFrets && !open && nextBase >= 1
  if (!fretsMove && !hasKeys) return null

  // Dropped frets cannot stay on a stringed directive: that line is a miss.
  const pianoOnly = !fretsMove && hasKeys
  const next: ChordDefine = {
    name: transposeToken(def.name, n, flats),
    instrument: pianoOnly ? 'piano' : def.instrument,
    directive: pianoOnly ? 'define' : def.directive,
  }
  if (fretsMove && frets) {
    next.baseFret = nextBase
    next.frets = [...frets]
    if (def.fingers) next.fingers = [...def.fingers]
  }
  if (hasKeys && def.keys) next.keys = transposePianoKeys(def.keys, n)
  return next
}

export function transposeDefineLine(line: string, n: number, flats: boolean): string | null {
  const def = asChordDefine(parseDefineDirective(line))
  if (!def) return line
  const next = transposeDefine(def, n, flats)
  return next ? serializeDefine(next) : null
}

export function rewriteDefineLines(source: string, n: number, flats: boolean): string {
  if (!n) return source
  return String(source ?? '')
    .split('\n')
    .flatMap((line) => {
      if (!isDefineKey(line.match(DIR)?.[1] ?? '')) return [line]
      const next = transposeDefineLine(line, n, flats)
      return next == null ? [] : [next]
    })
    .join('\n')
}

export function asChordDefine(r: DefineResult): ChordDefine | null {
  if (r.class !== 'parse') return null
  const { class: _c, ...def } = r
  return def
}

/** Header keys the define block sits after — META_KEYS plus t/st/artist. */
const DEFINE_HEADER = new Set([
  'title',
  't',
  'subtitle',
  'st',
  'artist',
  'composer',
  'key',
  'transpose',
  'tempo',
  'time',
  'duration',
  'capo',
  'x_origem',
  'x_youtube',
  'x_strum',
  'x_strum_set',
])

/**
 * Rewrite `{define…}` lines: drop the old ones and land the block immediately
 * after the META_KEYS header, before the first lyric or comment.
 */
export function writeDefines(source: string, defines: ChordDefine[]): string {
  const lines = String(source ?? '')
    .split('\n')
    .filter((l) => {
      const m = l.match(DIR)
      return !(m && isDefineKey(m[1] ?? ''))
    })
  let lastMeta = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (!line.trim()) continue
    const m = line.match(DIR)
    const k = (m?.[1] ?? '').toLowerCase()
    if (m && DEFINE_HEADER.has(k)) {
      lastMeta = i
      continue
    }
    break
  }
  lines.splice(lastMeta + 1, 0, ...defines.map(serializeDefine))
  return lines.join('\n')
}
