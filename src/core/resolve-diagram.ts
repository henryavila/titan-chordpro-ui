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
 * Parser-unknown piano name that still starts with a note (`Caug`).
 * Keys are read from that root. No root letter, or no keys, is a miss.
 * `+` never hits.
 */
function pianoUnknownOverride(
  overrides: readonly ChordDefine[],
  token: string,
): DiagramHit | null {
  if (token.includes('+')) return null
  const rootPc = keyIndex(token)
  if (rootPc == null) return null
  for (const def of overrides) {
    if (def.instrument !== 'piano') continue
    if (def.name !== token) continue
    if (!def.keys?.length) continue
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
    if (def.instrument !== instrument) continue
    if (def.name !== token) continue
    if (!def.frets?.length) continue
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
  if (def.instrument !== instrument) return false
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

  const parsed = parseChordToken(token)
  // `7+` is not aug or maj7. A define named C7+ does not make it a hit.
  if (token.includes('+')) return { class: 'miss', reason: 'unknown-token' }

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
