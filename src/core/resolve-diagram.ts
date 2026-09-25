/**
 * resolveDiagram: file `{define}` override, then package dictionary.
 * Guitar/ukulele token is shapeName; piano token is concert.
 */

import { lookupDict, pianoKeysOf, pianoKeysToRelative, type DictInstrument, type DictVoicing } from './chord-dict'
import type { ChordDefine, DefineInstrument } from './define'
import { parseChordToken } from './parse-chord'
import { pianoInversions, type PianoInversion, type PianoTone } from './piano-voicing'

export type { PianoInversion, PianoTone }
import { slashGrip } from './slash-voicing'
import { keyIndex } from './transpose'

export type DiagramInstrument = DictInstrument

export type DiagramVoicing = {
  baseFret?: number
  frets?: Array<number | 'x'>
  fingers?: Array<number | 'x'>
  keys?: number[]
  /** Close-position piano notes. The first sounding midi is the bass. */
  pianoTones?: PianoTone[]
  /** Bass spelling left out of the grip. The diagram names it. */
  bassIgnored?: string
}

export type DiagramHit = {
  class: 'hit'
  instrument: DiagramInstrument
  token: string
  source: 'override' | 'dictionary'
  voicing: DiagramVoicing
  /** Piano dictionary only. One entry when the bass is written. */
  inversions?: PianoInversion[]
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
 * Several matches: `pickDefine` keeps the same instrument.
 */
function servesInstrument(def: ChordDefine, instrument: DiagramInstrument): boolean {
  if (instrument === 'piano') return (def.keys?.length ?? 0) > 0
  const need = instrument === 'guitar' ? 6 : 4
  if ((def.frets?.length ?? 0) !== need) return false
  return def.instrument === instrument || def.instrument === 'piano'
}

/**
 * Same instrument first. A cross-payload line is used only when no
 * `def.instrument ===` the request also matches. Line order does not
 * decide between instruments.
 */
function pickDefine(
  matches: readonly ChordDefine[],
  instrument: DiagramInstrument,
): ChordDefine | undefined {
  let cross: ChordDefine | undefined
  for (const def of matches) {
    if (def.instrument === instrument) return def
    if (!cross) cross = def
  }
  return cross
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
 * A `+` that did not parse (`C+`) never hits.
 */
function pianoUnknownOverride(
  overrides: readonly ChordDefine[],
  token: string,
): DiagramHit | null {
  if (token.includes('+')) return null
  const rootPc = keyIndex(token)
  if (rootPc == null) return null
  const matches: ChordDefine[] = []
  for (const def of overrides) {
    if (!servesInstrument(def, 'piano')) continue
    if (def.name !== token) continue
    matches.push(def)
  }
  const def = pickDefine(matches, 'piano')
  if (!def) return null
  return {
    class: 'hit',
    instrument: 'piano',
    token,
    source: 'override',
    voicing: fromDefine(def, rootPc),
  }
}

/** Parser-unknown name: exact `{define}` name plus a fret shape. A bare `+` never hits. */
function exactFretOverride(
  overrides: readonly ChordDefine[],
  instrument: DiagramInstrument,
  token: string,
): DiagramHit | null {
  const matches: ChordDefine[] = []
  for (const def of overrides) {
    if (!servesInstrument(def, instrument)) continue
    if (def.name !== token) continue
    matches.push(def)
  }
  const def = pickDefine(matches, instrument)
  if (!def) return null
  return {
    class: 'hit',
    instrument,
    token,
    source: 'override',
    voicing: fromDefine(def, null),
  }
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

function mod12(n: number): number {
  return ((n % 12) + 12) % 12
}

function pianoHit(
  token: string,
  root: string,
  rootPc: number,
  quality: string,
  bassPc: number | null,
  keys: number[],
): DiagramHit {
  const inversions =
    pianoInversions({ token, root, rootPc, quality, bassPc }) ?? []
  const voicing: DiagramVoicing = { keys }
  const primary = inversions[0]
  if (primary) voicing.pianoTones = primary.tones
  return {
    class: 'hit',
    instrument: 'piano',
    token,
    source: 'dictionary',
    voicing,
    inversions,
  }
}

/** Piano always sounds the bass. Frets use a playable grip, or the plain chord. */
function slashHit(
  instrument: DiagramInstrument,
  token: string,
  root: string,
  rootPc: number,
  quality: string,
  bassPc: number,
  bassName: string,
): DiagramResolve {
  if (instrument === 'piano') {
    const keys = pianoKeysOf(quality)
    if (!keys) return { class: 'miss', reason: 'no-shape' }
    const rel = mod12(bassPc - rootPc)
    const has = keys.some((k) => mod12(k) === rel)
    return pianoHit(token, root, rootPc, quality, bassPc, has ? [...keys] : [...keys, rel])
  }
  const grip = slashGrip(instrument, rootPc, quality, bassPc, bassName)
  if (!grip) return { class: 'miss', reason: 'no-shape' }
  const voicing: DiagramVoicing = { baseFret: 1, frets: grip.frets }
  if (grip.bassIgnored) voicing.bassIgnored = grip.bassIgnored
  return { class: 'hit', instrument, token, source: 'dictionary', voicing }
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
  const token = String(opts.token ?? '')
    .replace(/[\u0022\u0027\u2018\u2019\u201C\u201D]/g, '')
    .trim()
  const instrument = opts.instrument
  if (!token || !isInstrument(instrument)) {
    return { class: 'miss', reason: 'unknown-token' }
  }

  const parsed = parseChordToken(token)
  // `C+` is not `C7+`. A plus that the catalog does not name never hits.
  if (token.includes('+') && parsed.class !== 'parse') {
    return { class: 'miss', reason: 'unknown-token' }
  }

  const overrides = opts.overrides ?? []
  if (parsed.class !== 'parse') {
    if (instrument === 'piano') {
      return pianoUnknownOverride(overrides, token) ?? { class: 'miss', reason: 'unknown-token' }
    }
    return exactFretOverride(overrides, instrument, token) ?? { class: 'miss', reason: 'unknown-token' }
  }
  const want = canonicalOf(token)
  if (!want) return { class: 'miss', reason: 'unknown-token' }

  const matches: ChordDefine[] = []
  for (const def of overrides) {
    if (!overrideMatch(def, instrument, token, want)) continue
    if (instrument !== 'piano' && !def.frets?.length) continue
    if (instrument === 'piano' && !def.keys?.length) continue
    matches.push(def)
  }
  const def = pickDefine(matches, instrument)
  if (def) {
    return {
      class: 'hit',
      instrument,
      token,
      source: 'override',
      voicing: fromDefine(def, want.rootPc),
    }
  }

  if (want.bassPc != null) {
    return slashHit(instrument, token, parsed.root, want.rootPc, want.quality, want.bassPc, parsed.bass ?? '')
  }

  const found = lookupDict(instrument, want.rootPc, want.quality)
  if (!found) return { class: 'miss', reason: 'no-shape' }
  if (instrument === 'piano') return pianoHit(token, parsed.root, want.rootPc, want.quality, null, found.keys ?? [])
  return {
    class: 'hit',
    instrument,
    token,
    source: 'dictionary',
    voicing: fromDict(found),
  }
}
