import type { ChartBlock, ChartRow, ChartSeg } from '../types'

/**
 * A row with nothing to sing: empty, chords only, or rhythm marks (`x///`).
 * Under the lyrics-only lens those rows become dead space in the middle of
 * the lyric and drop out of the reading — the file is unchanged.
 * Production quirks `/_`, `/-`, `x...` count as rhythm residue too.
 */
function noLyricRow(row: ChartRow): boolean {
  const t = row.segs.map((s) => s.text).join('').trim()
  if (!t) return true
  return /^[xX/\\|.%\-\s¨~'’_.]+$/.test(t) && /[xX/]/.test(t)
}

const isLetter = (c: string): boolean => /\p{L}/u.test(c)

/**
 * The x/// convention, after the anchoring chord is gone: `x` is the head of
 * the time; `/` is a beat that is not. A slash inside a word (`cami/nhar`) and
 * a hyphen (`pala-vra`) stay. After chords are stripped, marks often sit
 * against the previous lyric (`razão.[E]//` → `razão.//`, `Amém[G]x` → `Amémx`)
 * — those still count. Residue `/_`, `/-`, `x...` from production charts is
 * part of the mark run, not lyric.
 */
function isBeatMarkAt(s: string, i: number): boolean {
  const c = s[i]
  if (c !== 'x' && c !== 'X' && c !== '/') return false
  const prev = i > 0 ? (s[i - 1] as string) : ' '
  const next = i + 1 < s.length ? (s[i + 1] as string) : ''
  // Syllable break inside a sung word — never a clock mark.
  if (c === '/' && isLetter(prev) && isLetter(next)) return false
  // Mark run may end in production residue: /_  /-  x...  x.
  const nextOk =
    next === '' ||
    next === '/' ||
    next === 'x' ||
    next === 'X' ||
    next === '_' ||
    next === '-' ||
    next === '.' ||
    /\s/.test(next)
  if (!nextOk) return false
  if (c === 'x' || c === 'X') {
    // Letter x inside a word (Exaltado): next is a letter → already rejected.
    // Head after space/punct, or glued after a lyric once the chord left
    // (Amémx, Oh!x///): next is end, /, or residue.
    if (/\s/.test(prev) || prev === '/' || prev === 'x' || prev === 'X') return true
    if (isLetter(prev)) {
      return next === '/' || next === '' || next === '_' || next === '-' || next === '.'
    }
    // After punctuation / start of leftover text.
    return true
  }
  // `/` — word-internal already excluded; everything else is a beat.
  return true
}

function stripBeatMarks(text: string): string {
  const s = String(text ?? '')
  let out = ''
  for (let i = 0; i < s.length; ) {
    if (isBeatMarkAt(s, i)) {
      i++
      // Consume residue glued to the run (/_ /- x... x.).
      while (i < s.length && (s[i] === '_' || s[i] === '-')) i++
      if (s.slice(i, i + 3) === '...') i += 3
      else if (s[i] === '.' && (i + 1 >= s.length || /\s/.test(s[i + 1]!))) i++
      continue
    }
    out += s[i]
    i++
  }
  return out.replace(/[ \t]{2,}/g, ' ').replace(/^ +| +$/g, '')
}

/**
 * Text that sat under/after a chord: a leading clock run is never lyric.
 * Stripping here — before join — stops `amigo[Em]//` from becoming `amigo/`.
 */
function stripChordClock(text: string): string {
  return String(text ?? '').replace(
    /^[ \t]*(?:[xX][/xX]*|\/+)[_.\-]*(?:\.\.\.)?/,
    '',
  )
}

function stripChords(row: ChartRow): ChartRow {
  const joined = row.segs.map((s) => (s.chord ? stripChordClock(s.text) : s.text)).join('')
  const plain = stripBeatMarks(joined)
  const segs: ChartSeg[] = plain
    ? [{ chord: '', shape: '', hasShape: false, text: plain, tight: false, loose: false }]
    : []
  return { ...row, segs, plain }
}

/**
 * Lyrics-only reading: chords, tab, score and images leave the surface.
 * Rhythm-only / chord-only rows go with them, and beat marks (`x///`, `/`, a
 * lone `x`) are stripped from the lines that remain. Comments stay — hiding
 * those is a separate switch.
 */
export function lyricsOnlyBlocks(blocks: ChartBlock[]): ChartBlock[] {
  const out: ChartBlock[] = []
  for (const b of blocks) {
    if (b.kind === 'tab' || b.kind === 'score' || b.kind === 'image') continue
    if (b.kind !== 'stanza' && b.kind !== 'chorus') {
      out.push(b)
      continue
    }
    const rows = b.rows.filter((r) => !noLyricRow(r)).map(stripChords).filter((r) => r.plain.length > 0)
    if (!rows.length) continue
    out.push({ ...b, rows, shapeCapo: 0 })
  }
  return out
}
