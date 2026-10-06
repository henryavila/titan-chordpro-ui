import type {
  BlockMarks,
  CapoChordPair,
  CapoLegend,
  ChartBlock,
  ChartRow,
  ChartSeg,
  Lens,
  TitanChordproDocument,
} from '../types'
import {
  keyRootOf,
  nashvilleToken,
  transposeTextChords,
  transposeToken,
  usesFlats,
} from '../transpose'
import { groupChorus } from './group'
import { lyricsOnlyBlocks } from './letra'
import { musicOf } from './music'
import { flatten, groupNotes, markTight } from './work'

export type LayoutOpts = {
  /**
   * Semitones applied once to a view still in the written key.
   * Omitted means 0: `transpose()` already rewrote the chords and stored
   * the same count on `view.transposeSemitones`.
   */
  semitones?: number
  /** Capo of the song. */
  capo?: number
  /**
   * Dual (default): concert chord on the lyric, capo shape above.
   * `false`: rewrite the chart to the capo shapes — the reader is alone.
   */
  dual?: boolean
  /** Reading lens: chord spelling, or lyrics-only. */
  lens?: Lens
  /** Editing: no capo shapes and no lens — you do not edit a projection. */
  editing?: boolean
}

export type ChartLayout = {
  blocks: ChartBlock[]
  /**
   * True when at least one block shows a shape row — the chart then needs the
   * taller chord lane, and the auto-scroll a longer page.
   */
  twin: boolean
  /**
   * Distinct song chords as capo shapes vs sounding names (first appearance).
   * Present whenever a song capo is on — dual or not — so the tone sheet can
   * preview the progression. Empty when there is no capo or nothing to map.
   */
  capoPairs: CapoChordPair[]
  /** Dual-mode legend bar: same pairs, plus the first as `real` / `shape`. */
  legend: CapoLegend | null
  /** True when some block carries a capo of its own. */
  anyBlockCapo: boolean
}

export function layoutChart(view: TitanChordproDocument, opts: LayoutOpts = {}): ChartBlock[] {
  return layoutChartFull(view, opts).blocks
}

/**
 * Dual capo keeps concert names on the lyric and draws the fret shape above —
 * two people, one sheet. Capo without dual is the capo player alone: the
 * chart itself is rewritten to the shapes they fret. The sounding key does
 * not change.
 */
export function layoutChartFull(view: TitanChordproDocument, opts: LayoutOpts = {}): ChartLayout {
  const semis = opts.semitones ?? 0
  const capo = Math.max(0, opts.capo ?? 0)
  const editing = !!opts.editing
  const flats = usesFlats(view.meta.key)
  const keyRoot = keyRootOf(view.meta.key)
  const nash = !editing && opts.lens === 'nashville' && !!keyRoot
  const srcLines = String(view.source ?? '').split('\n')

  const drafts = groupChorus(groupNotes(flatten(view)), view.eocOf ?? {})

  // Song or `#capo:n` fret — the draw source. Edit/Nashville still need this;
  // they only zero the *display* projection (`capoReadOf`), not the playable fields.
  const playableCapoOf = (marks: BlockMarks): { fret: number; dual: boolean } => {
    const own = marks.blockCapo != null
    const fret = own ? (marks.blockCapo ?? 0) : capo
    if (fret <= 0) return { fret: 0, dual: false }
    const dual = own ? marks.blockCapoMap !== false : opts.dual !== false
    return { fret, dual }
  }

  // A capo chosen for ONE block follows that block's own dual mark (`#capo:n`
  // vs `#capo:n!`). The song-wide switch only applies when the block has none.
  const capoReadOf = (marks: BlockMarks): { fret: number; dual: boolean } => {
    if (editing || nash) return { fret: 0, dual: false }
    return playableCapoOf(marks)
  }

  const nashRoot = transposeToken(keyRoot, semis, flats)
  const display = (chord: string, read: { fret: number; dual: boolean }): { name: string; shape: string } => {
    if (!chord) return { name: chord, shape: '' }
    if (nash) {
      return { name: nashvilleToken(transposeToken(chord, semis, flats), nashRoot), shape: '' }
    }
    const real = semis ? transposeToken(chord, semis, flats) : chord
    if (read.fret <= 0) return { name: real, shape: '' }
    const shape = transposeToken(chord, semis - read.fret, flats)
    if (!read.dual) return { name: shape, shape: '' }
    return { name: real, shape }
  }

  let anyBlockCapo = false
  let twin = false
  const all: ChartBlock[] = drafts.map((draft): ChartBlock => {
    const music = musicOf(draft, srcLines)
    if (draft.kind === 'comment') {
      return { ...draft, text: transposeTextChords(draft.text, semis, flats), music }
    }
    if (draft.kind !== 'stanza' && draft.kind !== 'chorus') return { ...draft, music }

    const read = capoReadOf(draft)
    const playable = playableCapoOf(draft)
    const shapeCapo = read.dual ? read.fret : 0
    if (draft.blockCapo != null && draft.blockCapo > 0) anyBlockCapo = true
    if (shapeCapo > 0) twin = true
    const rows: ChartRow[] = draft.rows.map((row) => {
      const segs = row.segs.map((s): ChartSeg => {
        const d = display(s.chord, read)
        const concert = s.chord ? (semis ? transposeToken(s.chord, semis, flats) : s.chord) : ''
        const shapeName =
          s.chord && playable.fret > 0
            ? transposeToken(s.chord, semis - playable.fret, flats)
            : concert
        return {
          ...s,
          chord: d.name,
          shape: d.shape,
          hasShape: !!d.shape,
          concert,
          shapeName,
          capoFret: playable.fret,
        }
      })
      markTight(segs)
      return { ...row, segs }
    })
    return {
      ...draft,
      rows,
      shapeCapo,
      hasOwnCapo: draft.blockCapo != null && draft.blockCapo !== capo,
      music,
    }
  })

  // Distinct chords of the song, in first-appearance order — the tone sheet
  // and the dual legend both need the real progression, not just the key.
  let capoPairs: CapoChordPair[] = []
  if (!editing && !nash && capo > 0) {
    const seen = new Set<string>()
    for (const b of drafts) {
      if (b.kind !== 'stanza' && b.kind !== 'chorus') continue
      for (const row of b.rows) {
        for (const s of row.segs) {
          if (!s.chord) continue
          const real = transposeToken(s.chord, semis, flats)
          if (seen.has(real)) continue
          seen.add(real)
          capoPairs.push({
            real,
            shape: transposeToken(s.chord, semis - capo, flats),
          })
        }
      }
    }
  }

  let legend: CapoLegend | null = null
  if (capoPairs.length && opts.dual !== false) {
    const first = capoPairs[0]!
    legend = { real: first.real, shape: first.shape, pairs: capoPairs }
  }

  // Out of the reading, present to the editor: that is the whole point of `#~`.
  const lyricsOnly = !editing && opts.lens === 'letra'
  if (lyricsOnly) {
    twin = false
    legend = null
    capoPairs = []
  }
  const visible = editing ? all : all.filter((b) => b.kind !== 'hidden')
  const blocks = lyricsOnly ? lyricsOnlyBlocks(visible) : visible
  return { blocks, twin, capoPairs, legend, anyBlockCapo }
}
