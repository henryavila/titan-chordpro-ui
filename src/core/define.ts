/**
 * ChordPro `{define}` / `{define-guitar}` / `{define-ukulele}` — file override,
 * not package dictionary. Generic `{define:}` infers instrument from payload.
 */

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

  if (instrument !== 'piano' && fingers && fingers.length !== frets?.length) return miss()

  const parsed: DefineResult = {
    class: 'parse',
    name,
    instrument,
    directive,
  }
  if (instrument === 'piano') {
    parsed.keys = keys
    return parsed
  }
  parsed.baseFret = baseFret ?? 1
  parsed.frets = frets
  if (fingers) parsed.fingers = fingers
  return parsed
}

export function serializeDefine(def: ChordDefine): string {
  if (def.instrument === 'piano') {
    return `{${def.directive}: ${def.name} keys ${(def.keys ?? []).join(' ')}}`
  }
  const base = def.baseFret ?? 1
  const frets = fmtSlots(def.frets ?? [])
  const fingers = def.fingers ? ` fingers ${fmtSlots(def.fingers)}` : ''
  return `{${def.directive}: ${def.name} base-fret ${base} frets ${frets}${fingers}}`
}

export function asChordDefine(r: DefineResult): ChordDefine | null {
  if (r.class !== 'parse') return null
  const { class: _c, ...def } = r
  return def
}
