/**
 * Auto-scroll in musical time. The clock lives in `src/core/clock`.
 * This file re-exports it so existing imports keep working.
 */

export { ANCHOR_RAMP, ANCHOR_RATIO, anchorPx, pxAtScroll, scrollAtPx } from './clock/anchor'
export { BEATS_PER_ROW, buildTimeline } from './clock/build'
export {
  durationFromYoutubeHtml,
  formatDurationFromSec,
  hasSongDuration,
  maskDurationMmSs,
  normalizeDurationMmSs,
  songDurationSec,
} from './clock/duration'
export { clockOf } from './clock/inputs'
export { isPlayedLine, lineBeats } from './clock/marks'
export { beatsPerBar, marksPerBeat, sheetBpm } from './clock/meter'
export {
  barsAtPx,
  contentOrigin,
  etaSec,
  formatEta,
  playheadAtScroll,
  pxAtBars,
  runSec,
  scrollAtPlayhead,
} from './clock/playhead'
export type { Timeline, TimelineBlock, TimelineOpts, TimelineSeg } from './clock/types'
