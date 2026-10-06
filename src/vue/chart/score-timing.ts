import type { model } from '@coderline/alphatab'
import { beatsPerBar, marksPerBeat, scoreClock, type ScoreBarClock, type ScoreMoment } from '@henryavila/titan-chordpro-ui'

export type ScoreTiming = {
  text: string
  barCount: number
  seconds: number[]
  /** Click tempo: quarter BPM, or the dotted-quarter BPM in a compound meter. */
  moments: ScoreMoment[]
  start: number
}

/** Bar lengths and click changes for the bars the reference actually shows. */
export function timingFromScore(score: model.Score, text: string, start: number, end?: number): ScoreTiming {
  const barCount = score.masterBars.length
  const last = Math.min(end ?? barCount, barCount)
  const slice = score.masterBars.slice(Math.max(0, start - 1), last)
  const initial = score.tempo > 0 ? score.tempo : 120
  const bars: ScoreBarClock[] = slice.map((bar) => {
    const meter = `${bar.timeSignatureNumerator}/${bar.timeSignatureDenominator}`
    return {
      ticks: Math.max(0, bar.calculateDuration()),
      beats: beatsPerBar(meter),
      meter,
      tempos: bar.tempoAutomations.map((change) => ({ ratio: change.ratioPosition, bpm: change.value })),
    }
  })
  const clock = scoreClock(bars, initial)
  const moments = clock.moments.map((moment) => ({
    ...moment,
    bpm: marksPerBeat(moment.meter) === 3 ? (moment.bpm * 2) / 3 : moment.bpm,
  }))
  return { text, barCount, seconds: clock.seconds, moments, start }
}

/** Seconds of one drawn system, indexed from the excerpt's first bar. */
export function systemSeconds(seconds: readonly number[], start: number, first: number, last: number): number {
  let sum = 0
  for (let bar = first; bar <= last; bar++) sum += seconds[bar - start] ?? 0
  return sum
}
