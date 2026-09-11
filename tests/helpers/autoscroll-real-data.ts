import { lineBeats } from '../../src/core/timeline'

/**
 * HARD GATE for auto-scroll tests.
 *
 * Expected seconds come from the fixture, never from the unmarked-row
 * placeholder (`BEATS_PER_ROW`, “8 pulsos por linha”).
 *
 * Allowed: `{duration:}`, `{tempo:}`, `{time:}`, `x///` / `//` counted in
 * the source, lyric text that is in the file, real DOM heights.
 * Forbidden: `BEATS_PER_ROW`, `rows * 8`, `4 * 8 * 60/bpm`, any wall-clock
 * derived from the estimate layer.
 *
 * `tests/core/autoscroll-no-estimates.test.ts` greps the clock test files
 * and fails the suite if those tokens come back.
 */
export const AUTOSCROLL_CLOCK_TEST_FILES = [
  'tests/core/autoscroll-states.test.ts',
  'tests/browser/autoscroll.spec.ts',
  'tests/core/timeline-charts.test.ts',
  'tests/helpers/autoscroll-corpus.ts',
  'tests/helpers/autoscroll-real-data.ts',
] as const

export const AUTOSCROLL_FORBIDDEN_IN_CLOCK_TESTS = [
  /BEATS_PER_ROW/,
  /8 pulsos/i,
  /8-beat/,
  /placeholder estimate/i,
  /\(4\s*\/\s*14\)\s*\*\s*160/,
  /4 \* 8 \*/,
] as const

/** Beats the chart STATES on a line (`x///`, `//`). Unmarked lyrics add 0. */
export function markBeatsBefore(src: string, stop: RegExp): number {
  let n = 0
  for (const line of src.split('\n')) {
    if (stop.test(line)) break
    n += lineBeats(line)
  }
  return n
}
