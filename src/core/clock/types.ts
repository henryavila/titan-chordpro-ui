import type { BlockMusic } from '../types'

export type TimelineBlock = {
  /** Offset of the block inside the scrolled document, in px. */
  top: number
  /** Measured height of the block, in px. */
  h: number
  music: BlockMusic
  kind: string
  /**
   * Exact seconds for this slice, from a notation file.
   * When set, the chart's bar formula is not used.
   */
  seconds?: number
}

export type TimelineOpts = {
  /** BPM used for the clock (chart tempo, or the reader's own). */
  bpm: number
  /** Beats per bar, from `{time:}` — see {@link beatsPerBar}. */
  beatsPerBar: number
  /**
   * `x///` marks per beat, from `{time:}` — see {@link marksPerBeat}. Absent is
   * read as 1, the simple-meter answer, so a host built against the earlier
   * shape keeps the behaviour it had.
   */
  marksPerBeat?: number
  /** Declared song duration in seconds, when the chart states one. */
  durationSec: number | null
  /** Average pixel height of a bar — pace of last resort. */
  barPx: number
  /** Scrollable document height, for invalidation. */
  doc: number
  /** Viewport height, for invalidation. */
  viewport: number
}

export type TimelineSeg = {
  top: number
  h: number
  /** Seconds of music spent crossing this segment. */
  bars: number
  /** Seconds of music elapsed when the segment starts. */
  at: number
}

export type Timeline = {
  segs: TimelineSeg[]
  /**
   * Total seconds of music in the chart, and the length of the run: the segment
   * times add up to exactly this, and {@link runSec} returns it.
   */
  bars: number
  doc: number
  viewport: number
  /** Layer 1: seconds the chart states (`x///` played, tails, tabs, scores). */
  exact: number
  /** Layer 2: seconds estimated from sung rows, after calibration. */
  est: number
  /**
   * Calibration aimed at layer 2 before the speed ceiling and the closing pass
   * — a report of how far the chart's estimate sat from the declared duration,
   * not the factor the segments ended up carrying.
   */
  k: number
  /** True when the counted time already exceeds the declared duration. */
  over: boolean
  counted: boolean
  /**
   * Document y where the scroll ramp starts. First sung line when a compact
   * voiceless intro leads the chart; the reading line when that intro is
   * taller than a third of the viewport. Equal to {@link contentOrigin} when
   * there is no played intro to wait for.
   */
  hold: number
}
