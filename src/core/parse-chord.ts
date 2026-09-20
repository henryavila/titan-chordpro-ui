/**
 * Brazilian chord names (7M, 4, 9, 2, slash). `7+` is not aug or maj7.
 */

export type ChordParseClass = 'parse' | 'UNPARSED' | 'AMBIGUOUS'

export type ChordTokenParse = {
  class: 'parse'
  root: string
  quality: string
  bass?: string
}

export type ChordTokenMiss = {
  class: 'UNPARSED' | 'AMBIGUOUS'
}

export type ChordTokenResult = ChordTokenParse | ChordTokenMiss

const QUALITY: Record<string, string> = {
  '': 'major',
  M: 'major',
  m: 'm',
  'm(3b)': 'm',
  '2': 'sus2',
  '4': 'sus4',
  '5': '5',
  '6': '6',
  '6(9)': '6add9',
  '7': '7',
  '7(4)': '7sus4',
  '7(9)': '9',
  '7M': 'maj7',
  '7M(9)': 'maj9',
  '7sus4': '7sus4',
  '9': 'add9',
  dim: 'dim',
  m6: 'm6',
  M7: 'maj7',
  m7: 'm7',
  'm7(11)': 'm11',
  m9: 'm9',
  maj7: 'maj7',
  sus: 'sus4',
  sus2: 'sus2',
  sus4: 'sus4',
  'º': 'dim',
  '°': 'dim',
}

const AMBIGUOUS_SUFFIX = new Set(['7+'])

const ROOT = /^([A-G](?:#|b)?)(.*)$/
const BASS = /^[A-G](?:#|b)?$/

export function parseChordToken(raw: string): ChordTokenResult {
  const token = String(raw ?? '').trim()
  if (!token || /["'’]/.test(token)) return { class: 'UNPARSED' }

  let chord = token
  let bass: string | undefined
  const slash = token.indexOf('/')
  if (slash >= 0) {
    chord = token.slice(0, slash)
    bass = token.slice(slash + 1)
  }

  const m = chord.match(ROOT)
  if (!m || m[1] === undefined || m[2] === undefined) return { class: 'UNPARSED' }
  const suffix = m[2]
  if (AMBIGUOUS_SUFFIX.has(suffix) || suffix.includes('+')) return { class: 'AMBIGUOUS' }
  if (!Object.hasOwn(QUALITY, suffix)) return { class: 'UNPARSED' }
  const quality = QUALITY[suffix]
  if (quality === undefined) return { class: 'UNPARSED' }

  if (slash >= 0 && !BASS.test(bass ?? '')) return { class: 'AMBIGUOUS' }

  const parsed: ChordTokenParse = { class: 'parse', root: m[1], quality }
  if (bass) parsed.bass = bass
  return parsed
}
