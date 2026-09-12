const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

const IDX: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  'E#': 5,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
  'B#': 0,
}

export function usesFlats(key: string | null | undefined): boolean {
  return /b/.test(key || '')
}

export function transposeToken(tok: string, semis: number, flats: boolean): string {
  if (!tok || !semis) return tok
  return tok
    .split('/')
    .map((part) => {
      const m = part.match(/^([A-G](?:#|b)?)(.*)$/)
      if (!m || m[1] === undefined || !(m[1] in IDX)) return part
      const n = (((IDX[m[1]] ?? 0) + semis) % 12 + 12) % 12
      return (flats ? FLAT : SHARP)[n] + (m[2] ?? '')
    })
    .join('/')
}

export function transposeTextChords(text: string, semis: number, flats: boolean): string {
  if (!semis) return text
  return text.replace(/\[([^\]]*)\]/g, (_, c: string) => `[${transposeToken(c, semis, flats)}]`)
}

export function keyIndex(key: string): number | null {
  const m = key.trim().match(/^([A-G](?:#|b)?)/)
  if (!m || m[1] === undefined || !(m[1] in IDX)) return null
  return IDX[m[1]] ?? null
}

export function semitoneDelta(fromKey: string, toKey: string): number {
  const a = keyIndex(fromKey)
  const b = keyIndex(toKey)
  if (a === null || b === null) {
    throw new Error(`setKey: unsupported key (${fromKey} → ${toKey})`)
  }
  return ((b - a) % 12 + 12) % 12
}

/** Shortest signed interval, −6…+6. Ab → G is −1, not +11. */
export function signedSemitoneDelta(fromKey: string, toKey: string): number {
  const d = semitoneDelta(fromKey, toKey)
  return d > 6 ? d - 12 : d
}

/** Signed tons from the written key (`+ ½ tom`, `− 1 tom`). Empty at 0. */
export function formatToneShift(semis: number): string {
  if (!semis) return ''
  const n = Math.trunc(semis)
  const sign = n > 0 ? '+' : '−'
  const abs = Math.abs(n)
  const whole = Math.floor(abs / 2)
  const half = abs % 2 === 1
  if (!whole) return `${sign} ½ tom`
  const unit = whole === 1 ? 'tom' : 'tons'
  if (!half) return `${sign} ${whole} ${unit}`
  return `${sign} ${whole} ½ ${unit}`
}

/** Scale degrees, the Nashville way: 1 #1 2 b3 3 4 #4 5 b6 6 b7 7. */
const DEG: Record<number, string> = {
  0: '1',
  1: '#1',
  2: '2',
  3: 'b3',
  4: '3',
  5: '4',
  6: '#4',
  7: '5',
  8: 'b6',
  9: '6',
  10: 'b7',
  11: '7',
}

/** The root of a key signature, ignoring the mode ("Am" → "A"). */
export function keyRootOf(key: string | null | undefined): string {
  return (String(key ?? '').match(/^\s*([A-G](?:#|b)?)/) || [])[1] ?? ''
}

/**
 * Nashville: the degree instead of the name. The suffix survives — "Em" in G
 * becomes "6m" — and a slash chord keeps both halves.
 */
export function nashvilleToken(tok: string, keyRoot: string): string {
  if (!tok || !(keyRoot in IDX)) return tok
  return tok
    .split('/')
    .map((part) => {
      const m = part.match(/^([A-G](?:#|b)?)(.*)$/)
      if (!m || m[1] === undefined || !(m[1] in IDX)) return part
      const d = ((((IDX[m[1]] ?? 0) - (IDX[keyRoot] ?? 0)) % 12) + 12) % 12
      return DEG[d] + (m[2] ?? '')
    })
    .join('/')
}
