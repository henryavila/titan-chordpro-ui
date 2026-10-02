import { anchorWords, playedColumns, rowParts } from '@henryavila/titan-chordpro-ui'
import type { AnchorWord, PlayedCol } from '@henryavila/titan-chordpro-ui'

/** A lyric row as the editor draws it: reading columns, with the anchor on the letter. */
export type EditRow = {
  li: number
  chords: Array<{ name: string; off: number }>
  plain: string
  /** Source offsets a caret marks. One per chord, on that letter. */
  anchors: number[]
  /** Voiceless intro/interlude: columns like reading, not a pile of pills. */
  played: boolean
  columns: PlayedCol[]
  /** Sung line, grouped like reading so each chord reserves its width. */
  words: AnchorWord[]
}

/** A row split into measurable syllables — what a chord can be dropped on. */
export function buildRow(raw: string, li: number): EditRow {
  const p = rowParts(raw)
  const columns = playedColumns(raw)
  const played = columns !== null
  return {
    li,
    chords: p.chords.map((c) => ({ name: c.name, off: c.off })),
    plain: p.plain,
    anchors: p.chords.map((c) => c.off),
    played,
    columns: columns ?? [],
    words: played ? [] : anchorWords(raw),
  }
}
