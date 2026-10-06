import type { ChartBlock, Lens } from '../types'

export function maxPlainChars(blocks: ChartBlock[]): number {
  let max = 0
  for (const b of blocks) {
    if (b.kind === 'stanza' || b.kind === 'chorus') {
      for (const r of b.rows) max = Math.max(max, r.plain.length)
    }
  }
  return max
}

export function fitFactor(width: number, maxChars: number, base: number, fit: boolean): number {
  if (!fit || maxChars <= 0) return 1
  const avail = Math.min(width, 880) - 56
  return Math.max(0.68, Math.min(1.25, avail / (maxChars * base * 0.485)))
}

export function typeScale(
  bias: number,
  fit: boolean,
  width: number,
  maxChars: number,
  twin = false,
  /**
   * Reading lens. `letra` is a vocal surface: at most one blank line between
   * blocks, tighter row pad — not the cifra’s rehearsal gap with chords gone.
   */
  lens: Lens = 'none',
) {
  const base = 18 + bias * 1.7
  const factor = fitFactor(width, maxChars, base, fit)
  const lyric = base * factor
  const chord = lyric * 1.18
  const tab = Math.max(9.5, Math.min(14, lyric * 0.62))
  // The dual chart needs a second chord lane above the line.
  const lane = twin ? 2.55 : 1.4
  const letra = lens === 'letra'
  return {
    lyricPx: `${lyric.toFixed(1)}px`,
    chordPx: `${chord.toFixed(1)}px`,
    shapePx: `${chord.toFixed(1)}px`,
    chordBox: `${(chord * lane).toFixed(1)}px`,
    /** Lane height for a block that shows no shape row. */
    chordBoxPlain: `${(chord * 1.4).toFixed(1)}px`,
    tabPx: `${tab.toFixed(1)}px`,
    tabLabelPx: `${(tab * 0.85).toFixed(1)}px`,
    tabRow: `${(tab * 1.8).toFixed(1)}px`,
    rowPad: letra ? (fit ? '2px' : '3px') : fit ? '3px' : '6px',
    // Cifra: room for the chord lane between boxes. Letra: exactly one blank
    // line (same px as lyricPx — Math.round would overshoot on fractional sizes).
    blockGap: letra
      ? `${lyric.toFixed(1)}px`
      : `${Math.round(lyric * (fit ? 2.1 : 2.6))}px`,
    /** Average pixel height of one bar — the auto-scroll fallback pace. */
    barPx: Math.max(18, lyric * 1.15 + chord * lane + (fit ? 6 : 12)),
  }
}

/**
 * Typography the editing surface needs on top of the reading one.
 * `pillLane` is the gap above the in-place input. The lyric itself reserves
 * width per chord, the way reading does, so `editLineH` is no longer the lane.
 */
export function editTypeScale(bias: number, compact: boolean) {
  const lyric = 18 + bias * 1.7
  const chord = lyric * 1.18
  return {
    /** Height of the pill lane above the first visual line of a row. */
    pillLane: '29px',
    // The thumb needs a bigger target than the mouse does.
    pillH: compact ? '30px' : '23px',
    editLineH: `${Math.round(lyric * 1.15 + (compact ? 62 : 52))}px`,
    chordEditPx: `${Math.max(11, Math.min(15, chord * 0.62)).toFixed(1)}px`,
  }
}
