/**
 * Musical time of a Guitar Pro / MusicXML excerpt, without the engraver.
 *
 * A bar's length is MIDI ticks (960 per quarter). Tempo changes inside the
 * bar are ratios of that length. The result is seconds the page can walk.
 * It does not read ChordPro marks or estimate a lyric row.
 */

export const SCORE_TICKS_PER_QUARTER = 960

export type ScoreTempoChange = { ratio: number; bpm: number }

export type ScoreBarClock = {
  /** MIDI ticks in the bar, pickup included when the file says so. */
  ticks: number
  /** Click beats in the bar (4/4 is 4, 6/8 is 2). */
  beats: number
  /** Written meter, such as `4/4`. */
  meter: string
  tempos?: readonly ScoreTempoChange[]
}

/** A point where the click's tempo or meter changes. `bpm` is the quarter-note tempo. */
export type ScoreMoment = { at: number; bpm: number; beats: number; meter: string }

function ticksToSec(ticks: number, bpm: number): number {
  return (Math.max(0, ticks) * 60) / (Math.max(1, bpm) * SCORE_TICKS_PER_QUARTER)
}

/**
 * Seconds of each bar, and the moments the click follows.
 * `initialBpm` is the tempo in force before the first bar.
 */
export function scoreClock(
  bars: readonly ScoreBarClock[],
  initialBpm: number,
): { seconds: number[]; moments: ScoreMoment[] } {
  let tempo = Math.max(1, initialBpm)
  let at = 0
  const seconds: number[] = []
  const moments: ScoreMoment[] = []
  const push = (bpm: number, beats: number, meter: string) => {
    const last = moments[moments.length - 1]
    if (last && last.at === at && last.bpm === bpm && last.beats === beats && last.meter === meter) return
    if (last && last.bpm === bpm && last.beats === beats && last.meter === meter) return
    moments.push({ at, bpm, beats, meter })
  }

  for (const bar of bars) {
    const duration = Math.max(0, bar.ticks)
    const changes = [...(bar.tempos ?? [])]
      .filter((change) => Number.isFinite(change.bpm) && change.bpm > 0)
      .sort((a, b) => a.ratio - b.ratio)
    let cursor = 0
    let barSec = 0
    for (const change of changes) {
      if (change.ratio > 0) break
      tempo = Math.max(1, change.bpm)
    }
    push(tempo, bar.beats, bar.meter)
    for (const change of changes) {
      if (change.ratio <= 0) continue
      const tick = Math.min(duration, Math.max(0, change.ratio) * duration)
      const delta = tick - cursor
      if (delta > 0) {
        const sec = ticksToSec(delta, tempo)
        barSec += sec
        at += sec
        cursor = tick
      }
      tempo = Math.max(1, change.bpm)
      push(tempo, bar.beats, bar.meter)
    }
    const rest = duration - cursor
    if (rest > 0) {
      const sec = ticksToSec(rest, tempo)
      barSec += sec
      at += sec
    }
    seconds.push(barSec)
  }

  if (!moments.length) moments.push({ at: 0, bpm: tempo, beats: 4, meter: '4/4' })
  return { seconds, moments }
}
