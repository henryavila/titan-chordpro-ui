import type { ChartSeg } from './types'

/** One syllable column: the chord sits directly above `text`, same left edge. */
export type ReadingCell = {
  text: string
  chord: string
  shape: string
  hasShape: boolean
  hasChord: boolean
}

/**
 * A word: the group that never breaks. `tail` is the real whitespace that
 * followed it in the source — the only place the line is allowed to wrap.
 */
export type ReadingWord = {
  cells: ReadingCell[]
  tail: string
  hasTail: boolean
}

function cell(text: string, src: ChartSeg | null): ReadingCell {
  return {
    text,
    chord: src ? src.chord : '',
    shape: src && src.shape ? src.shape : '',
    hasShape: !!(src && src.shape),
    hasChord: !!src,
  }
}

/**
 * Chord anchoring and clearance, for reading only.
 *
 * The unit that wraps is the **word**, not the segment. Inside a word every
 * syllable is its own column that reserves the width of its chord plus a gap,
 * so a chord never touches its neighbour nor paints over the lyric — and
 * `mo|tivos` never splits at the line turn just because a chord changed inside
 * it. Real whitespace becomes the word's tail: that, and only that, is a break
 * point.
 *
 * Neither the ViewModel nor the source is touched.
 */
export function readingWords(segs: ChartSeg[]): ReadingWord[] {
  const words: ReadingWord[] = []
  /** Index of the word still taking syllables, or -1 between words. */
  let open_ = -1
  let carry: ChartSeg | null = null

  const open = (): ReadingWord => {
    if (open_ < 0) {
      words.push({ cells: [], tail: '', hasTail: false })
      open_ = words.length - 1
    }
    return words[open_] as ReadingWord
  }
  /** A chord whose segment carried no text of its own still needs a column. */
  const flush = () => {
    if (carry) {
      open().cells.push(cell('', carry))
      carry = null
    }
  }

  for (const seg of segs ?? []) {
    if (seg.chord) {
      flush()
      carry = seg
    }
    const parts = String(seg.text ?? '').match(/\s+|\S+/g) ?? []
    for (const part of parts) {
      if (/\s/.test(part[0] as string)) {
        if (open_ >= 0) {
          const w = words[open_] as ReadingWord
          w.tail += part
          w.hasTail = true
          open_ = -1
        } else {
          words.push({ cells: [], tail: part, hasTail: true })
        }
        continue
      }
      const src = carry
      carry = null
      open().cells.push(cell(part, src))
    }
  }
  flush()
  return words
}
