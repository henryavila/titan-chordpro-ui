/**
 * resolveDiagram: file `{define}` override, then package dictionary.
 * Guitar/ukulele token is shapeName; piano token is concert.
 */

import { lookupDict, pianoKeysToRelative, type DictInstrument, type DictVoicing } from './chord-dict'
import type { ChordDefine, DefineInstrument } from './define'
import { parseChordToken } from './parse-chord'
import { keyIndex } from './transpose'

export type DiagramInstrument = DictInstrument

export type DiagramVoicing = {
  baseFret?: number
  frets?: Array<number | 'x'>
  fingers?: Array<number | 'x'>
  keys?: number[]
}

export type DiagramHit = {
  class: 'hit'
  instrument: DiagramInstrument
  token: string
  source: 'override' | 'dictionary'
  voicing: DiagramVoicing
}

export type DiagramMiss = {
  class: 'miss'
  reason: 'unknown-token' | 'no-shape'
}

export type DiagramResolve = DiagramHit | DiagramMiss

export type ResolveDiagramOpts = {
  token: string
  instrument: DiagramInstrument
  overrides?: ChordDefine[]
}

type Canonical = { rootPc: number; quality: string; bassPc: number | null }

function canonicalOf(token: string): Canonical | null {
  const parsed = parseChordToken(token)
  if (parsed.class !== 'parse') return null
  const rootPc = keyIndex(parsed.root)
  if (rootPc === null) return null
  const bassPc = parsed.bass != null ? keyIndex(parsed.bass) : null
  if (parsed.bass != null && bassPc === null) return null
  return { rootPc, quality: parsed.quality, bassPc }
}

function sameCanonical(a: Canonical, b: Canonical): boolean {
  return a.rootPc === b.rootPc && a.quality === b.quality && a.bassPc === b.bassPc
}

function isInstrument(value: string): value is DiagramInstrument {
  return value === 'guitar' || value === 'ukulele' || value === 'piano'
}

/**
 * Payload, not the label from `parseDefineDirective`. Keys force `piano`
 * even when 6 or 4 frets are still on the line; those frets still hit
 * guitar or ukulele. Keys on a string directive still hit piano.
 * No frets: guitar and ukulele miss. No keys: piano misses.
 */
function servesInstrument(def: ChordDefine, instrument: DiagramInstrument): boolean {
  if (instrument === 'piano') return (def.keys?.length ?? 0) > 0
  const need = instrument === 'guitar' ? 6 : 4
  if ((def.frets?.length ?? 0) !== need) return false
  return def.instrument === instrument || def.instrument === 'piano'
}

function fromDefine(def: ChordDefine, rootPc: number | null): DiagramVoicing {
  const voicing: DiagramVoicing = {}
  if (def.frets?.length) {
    voicing.baseFret = def.baseFret ?? 1
    voicing.frets = [...def.frets]
  }
  if (def.fingers) voicing.fingers = [...def.fingers]
  if (def.keys?.length) {
    voicing.keys = rootPc == null ? [...def.keys] : pianoKeysToRelative(def.keys, rootPc)
  }
  return voicing
}

/**
 * Straight and curly quotes. A token that contains one is not a chord name
 * on guitar, ukulele, or piano — checked before any file override.
 * U+0022 U+0027 U+2018 U+2019 U+201C U+201D.
 */
const CHORD_NAME_QUOTE = /[\u0022\u0027\u2018\u2019\u201C\u201D]/

/**
 * Parser-unknown piano name that still starts with a note (`Caug`).
 * Keys are read from that root. No root letter, or no keys, is a miss.
 * `+` and quotes never hit.
 */
function pianoUnknownOverride(
  overrides: readonly ChordDefine[],
  token: string,
): DiagramHit | null {
  if (token.includes('+') || CHORD_NAME_QUOTE.test(token)) return null
  const rootPc = keyIndex(token)
  if (rootPc == null) return null
  for (const def of overrides) {
    if (!servesInstrument(def, 'piano')) continue
    if (def.name !== token) continue
    return {
      class: 'hit',
      instrument: 'piano',
      token,
      source: 'override',
      voicing: fromDefine(def, rootPc),
    }
  }
  return null
}

/** Parser-unknown name: exact `{define}` name plus a fret shape. `+` never hits. */
function exactFretOverride(
  overrides: readonly ChordDefine[],
  instrument: DiagramInstrument,
  token: string,
): DiagramHit | null {
  for (const def of overrides) {
    if (!servesInstrument(def, instrument)) continue
    if (def.name !== token) continue
    return {
      class: 'hit',
      instrument,
      token,
      source: 'override',
      voicing: fromDefine(def, null),
    }
  }
  return null
}

function fromDict(found: DictVoicing): DiagramVoicing {
  const voicing: DiagramVoicing = {}
  if (found.frets?.length) {
    voicing.baseFret = found.baseFret ?? 1
    voicing.frets = [...found.frets]
  }
  if (found.fingers) voicing.fingers = [...found.fingers]
  if (found.keys?.length) voicing.keys = [...found.keys]
  return voicing
}

function overrideMatch(
  def: ChordDefine,
  instrument: DefineInstrument,
  token: string,
  want: Canonical,
): boolean {
  if (!servesInstrument(def, instrument)) return false
  if (def.name === token) return true
  const got = canonicalOf(def.name)
  return !!got && sameCanonical(got, want)
}

export function resolveDiagram(opts: ResolveDiagramOpts): DiagramResolve {
  const token = String(opts.token ?? '').trim()
  const instrument = opts.instrument
  if (!token || !isInstrument(instrument)) {
    return { class: 'miss', reason: 'unknown-token' }
  }

  // Quotes and `+` are not chord names. A define does not make them a hit.
  if (CHORD_NAME_QUOTE.test(token) || token.includes('+')) {
    return { class: 'miss', reason: 'unknown-token' }
  }

  const parsed = parseChordToken(token)
  const overrides = opts.overrides ?? []
  if (parsed.class !== 'parse') {
    if (instrument === 'piano') {
      return pianoUnknownOverride(overrides, token) ?? { class: 'miss', reason: 'unknown-token' }
    }
    return exactFretOverride(overrides, instrument, token) ?? { class: 'miss', reason: 'unknown-token' }
  }
  const want = canonicalOf(token)
  if (!want) return { class: 'miss', reason: 'unknown-token' }

  for (const def of overrides) {
    if (!overrideMatch(def, instrument, token, want)) continue
    if (instrument !== 'piano' && !def.frets?.length) continue
    if (instrument === 'piano' && !def.keys?.length) continue
    return {
      class: 'hit',
      instrument,
      token,
      source: 'override',
      voicing: fromDefine(def, want.rootPc),
    }
  }

  if (want.bassPc != null) return { class: 'miss', reason: 'no-shape' }

  const found = lookupDict(instrument, want.rootPc, want.quality)
  if (!found) return { class: 'miss', reason: 'no-shape' }
  return {
    class: 'hit',
    instrument,
    token,
    source: 'dictionary',
    voicing: fromDict(found),
  }
}
