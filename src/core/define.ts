/**
 * ChordPro `{define}` / `{define-guitar}` / `{define-ukulele}` — file override,
 * not package dictionary. Generic `{define:}` infers instrument from payload.
 */

import { pianoSoundingPitchClasses } from './chord-dict'
import { parseChordToken } from './parse-chord'
import { keyIndex, transposeToken } from './transpose'

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

function isPitchClass(k: number): boolean {
  return k >= 0 && k <= 11
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12
}

function shiftKey(k: number, n: number): number {
  if (isPitchClass(k)) return mod12(k + n)
  return k + n
}

function sameOrder(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((pc, i) => pc === b[i])
}

/**
 * Shifted MIDI that would land on an interval (≤ 17) is lifted by the same
 * number of octaves until every key is above 17. Spacing stays.
 */
function keepMidiAboveIntervals(keys: readonly number[]): number[] {
  const min = Math.min(...keys)
  if (min > 17) return [...keys]
  const octaves = Math.floor((17 - min) / 12) + 1
  const bump = octaves * 12
  return keys.map((k) => k + bump)
}

/**
 * 0–11, and 0–17 that includes a 12–17 interval: shift the draw's sounding
 * classes inside 0–11. Do not add n to a 12–17 interval. Keep the absolute
 * list, else the relative list, that the renamed chord reads back. When
 * neither does, store 60 + pc. Do not throw.
 * Any key above 17 or below 0 is MIDI: add n. Do not fold with 60 + (mod 12).
 * If a result is ≤ 17, lift every key by the same octaves until each is > 17.
 */
function transposePianoKeys(def: ChordDefine, n: number, flats: boolean): number[] {
  const keys = def.keys ?? []
  if (keys.some((k) => k > 17 || k < 0)) {
    return keepMidiAboveIntervals(keys.map((k) => k + n))
  }
  const fallback = () => keys.map((k) => shiftKey(k, n))
  if (!keys.length) return []
  const parsed = parseChordToken(def.name)
  if (parsed.class !== 'parse') return fallback()
  const rootPc = keyIndex(parsed.root)
  if (rootPc === null) return fallback()
  const bassPc = parsed.bass != null ? keyIndex(parsed.bass) : null
  if (parsed.bass != null && bassPc === null) return fallback()
  const sounding = pianoSoundingPitchClasses(keys, rootPc, parsed.quality, bassPc)
  const shifted = sounding.map((k) => mod12(k + n))
  const renamed = parseChordToken(transposeToken(def.name, n, flats))
  if (renamed.class !== 'parse') return shifted
  const newRoot = keyIndex(renamed.root)
  if (newRoot === null) return shifted
  const newBass = renamed.bass != null ? keyIndex(renamed.bass) : null
  if (renamed.bass != null && newBass === null) return shifted
  const readsShifted = (candidate: readonly number[]) =>
    sameOrder(pianoSoundingPitchClasses(candidate, newRoot, renamed.quality, newBass), shifted)
  if (readsShifted(shifted)) return shifted
  const relative = shifted.map((pc) => mod12(pc - newRoot))
  if (readsShifted(relative)) return relative
  return shifted.map((pc) => 60 + pc)
}

/**
 * Guitar/ukulele: bump `baseFret` when every slot is >0 or `x`; drop if any
 * string is open (fret 0) or the new base would fall below 1. Piano keys
 * inside 0–11 are stored so the renamed chord reads the shifted sounding
 * classes, or as 60 + pc when neither 0–11 candidate does. A 12–17 interval
 * uses that same path. MIDI (any key above 17 or below 0) adds n and stays
 * above 17 without folding into one octave.
 */
export function transposeDefine(def: ChordDefine, n: number, flats: boolean): ChordDefine | null {
  if (!n) return { ...def }
  if (def.frets?.some((f) => f === 0)) return null
  const next: ChordDefine = { ...def, name: transposeToken(def.name, n, flats) }
  if (def.frets?.length) {
    const base = (def.baseFret ?? 1) + n
    if (base < 1) return null
    next.baseFret = base
  }
  if (def.keys?.length) next.keys = transposePianoKeys(def, n, flats)
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
