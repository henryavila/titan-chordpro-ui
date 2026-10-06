/**
 * One source line: the lyric, the chords on it, and the edits that move a
 * chord without dragging the words.
 */

import { isPlayedLine } from '../timeline'

export type ChordRef = { name: string; off: number }
export type RowParts = { plain: string; chords: ChordRef[] }

/** One chord on a voiceless line, with the `x///` clock that gives it width. */
export type PlayedCol = {
  idx: number
  name: string
  off: number
  marks: Array<{ ch: string; i: number }>
  tail: Array<{ ch: string; i: number }>
}

/**
 * A played line (intro, interlude, ending) is columns, like reading: the
 * marks are the clock, the chord sits on them. Null on a sung line — those
 * stay syllables with a pill floating above.
 */
export function playedColumns(line: string): PlayedCol[] | null {
  if (!isPlayedLine(line)) return null
  const p = rowParts(line)
  if (!p.chords.length) return []
  const cols: PlayedCol[] = []
  for (let i = 0; i < p.chords.length; i++) {
    const c = p.chords[i]!
    const from = c.off
    const to = p.chords[i + 1]?.off ?? p.plain.length
    const slice = p.plain.slice(from, to)
    const m = /^(\S*)([\s\S]*)$/.exec(slice)
    const markStr = m?.[1] ?? ''
    const tailStr = m?.[2] ?? ''
    cols.push({
      idx: i,
      name: c.name,
      off: c.off,
      marks: [...markStr].map((ch, k) => ({ ch, i: from + k })),
      tail: [...tailStr].map((ch, k) => ({ ch, i: from + markStr.length + k })),
    })
  }
  return cols
}

/** A lyric line split into what is sung and where each chord sits in it. */
export function rowParts(text: string): RowParts {
  let plain = ''
  const chords: ChordRef[] = []
  const re = /\[([^\]]*)\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    plain += text.slice(last, m.index)
    chords.push({ name: m[1] ?? '', off: plain.length })
    last = re.lastIndex
  }
  return { plain: plain + text.slice(last), chords }
}

/** One source character, with the index a chord offset uses. */
export type AnchorChar = { ch: string; i: number }

/** A syllable column. `chord` sits on the left edge of `chars`, as in reading. */
export type AnchorCell = {
  chord: { name: string; idx: number; off: number } | null
  chars: AnchorChar[]
}

/**
 * A word the line may wrap after, never inside. `tail` is the real whitespace
 * that followed it — the only break point.
 */
export type AnchorWord = {
  cells: AnchorCell[]
  tail: AnchorChar[]
}

function charsOf(plain: string, from: number, to: number): AnchorChar[] {
  const out: AnchorChar[] = []
  for (let i = from; i < to; i++) out.push({ ch: plain[i] ?? '', i })
  return out
}

/**
 * Sung line, grouped the way reading groups it: each chord is a column that
 * reserves its own width, and a word never breaks where a chord changes.
 * Character indexes stay the source offsets, so a marker can sit on the exact
 * letter the chord is anchored to.
 *
 * Voiceless lines stay on `playedColumns` — this is the sung path.
 */
export function anchorWords(line: string): AnchorWord[] {
  const p = rowParts(line)
  type Seg = { chord: AnchorCell['chord']; from: number; to: number }
  const segs: Seg[] = []
  let cursor = 0
  for (let i = 0; i < p.chords.length; i++) {
    const c = p.chords[i]!
    if (c.off > cursor) {
      segs.push({ chord: null, from: cursor, to: c.off })
      cursor = c.off
    }
    const next = i + 1 < p.chords.length ? p.chords[i + 1]!.off : p.plain.length
    const to = Math.max(c.off, next)
    segs.push({ chord: { name: c.name, idx: i, off: c.off }, from: c.off, to })
    cursor = to
  }
  if (cursor < p.plain.length) segs.push({ chord: null, from: cursor, to: p.plain.length })

  const words: AnchorWord[] = []
  let open_ = -1
  let carry: AnchorCell['chord'] = null
  const open = (): AnchorWord => {
    if (open_ < 0) {
      words.push({ cells: [], tail: [] })
      open_ = words.length - 1
    }
    return words[open_] as AnchorWord
  }
  const flush = () => {
    if (!carry) return
    open().cells.push({ chord: carry, chars: [] })
    carry = null
  }

  for (const seg of segs) {
    if (seg.chord) {
      flush()
      carry = seg.chord
    }
    const parts = p.plain.slice(seg.from, seg.to).match(/\s+|\S+/g) ?? []
    let at = seg.from
    for (const part of parts) {
      const from = at
      at += part.length
      if (/\s/.test(part[0] ?? '')) {
        const chunk = charsOf(p.plain, from, at)
        if (open_ >= 0) {
          ;(words[open_] as AnchorWord).tail.push(...chunk)
          open_ = -1
        } else words.push({ cells: [], tail: chunk })
        continue
      }
      const src = carry
      carry = null
      open().cells.push({ chord: src, chars: charsOf(p.plain, from, at) })
    }
  }
  flush()
  return words
}

/** The inverse: put the chords back into the lyric, in order. */
export function rowJoin(plain: string, chords: ChordRef[]): string {
  const list = [...chords].sort((a, b) => a.off - b.off)
  let out = ''
  let at = 0
  for (const c of list) {
    const off = Math.max(0, Math.min(plain.length, Math.round(c.off)))
    out += plain.slice(at, off) + `[${c.name}]`
    at = off
  }
  return out + plain.slice(at)
}

/** Move one chord of a line to a new position in the lyric. */
export function moveChord(line: string, idx: number, off: number): string {
  const p = rowParts(line)
  const c = p.chords[idx]
  if (!c) return line
  const chords = p.chords.map((x, i) => (i === idx ? { ...x, off } : x))
  return rowJoin(p.plain, chords)
}

export function addChord(line: string, off: number, name: string): string {
  const p = rowParts(line)
  return rowJoin(p.plain, [...p.chords, { name, off }])
}

export function removeChord(line: string, idx: number): string {
  const p = rowParts(line)
  if (!p.chords[idx]) return line
  return rowJoin(
    p.plain,
    p.chords.filter((_, i) => i !== idx),
  )
}

export function renameChord(line: string, idx: number, name: string): string {
  const p = rowParts(line)
  if (!p.chords[idx]) return line
  return rowJoin(
    p.plain,
    p.chords.map((c, i) => (i === idx ? { ...c, name } : c)),
  )
}

/**
 * Prefix/suffix diff: fixing a typo must not drag the line's chords along.
 * Only what sits inside the changed stretch moves — everything before and
 * after keeps the syllable it was written over.
 */
export function setLyric(line: string, plain: string): string {
  const p = rowParts(line)
  const old = p.plain
  if (plain === old) return line
  let cp = 0
  while (cp < old.length && cp < plain.length && old[cp] === plain[cp]) cp++
  let cs = 0
  while (
    cs < old.length - cp &&
    cs < plain.length - cp &&
    old[old.length - 1 - cs] === plain[plain.length - 1 - cs]
  )
    cs++
  const d = plain.length - old.length
  const chords = p.chords.map((c) => {
    let o = c.off
    if (o >= old.length - cs) o += d
    else if (o > cp) o = Math.min(o, Math.max(cp, plain.length - cs))
    return { name: c.name, off: Math.max(0, Math.min(plain.length, o)) }
  })
  return rowJoin(plain, chords)
}

/** The name a newly placed chord opens with: the chart's own first chord. */
export function lastChordName(source: string): string {
  const m = String(source ?? '').match(/\[([^\]]+)\]/)
  return m ? (m[1] ?? 'C') : 'C'
}
