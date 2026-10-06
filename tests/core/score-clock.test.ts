import { describe, expect, it } from 'vitest'
import { scoreClock, SCORE_TICKS_PER_QUARTER } from '../../src/core/score-clock'
import { songScoreBlock } from '../../src/core/score-reference'
import { buildTimeline } from '../../src/core/timeline'

const bar = (ticks: number, tempos?: { ratio: number; bpm: number }[]) => ({
  ticks,
  beats: 4,
  meter: '4/4',
  ...(tempos ? { tempos } : {}),
})

describe('score clock', () => {
  it('counts a 4/4 bar at 120 as two seconds', () => {
    const quarter = SCORE_TICKS_PER_QUARTER
    const clock = scoreClock([bar(quarter * 4)], 120)
    expect(clock.seconds).toEqual([2])
    expect(clock.moments).toEqual([{ at: 0, bpm: 120, beats: 4, meter: '4/4' }])
  })

  it('keeps each bar on its own seconds', () => {
    const clock = scoreClock([bar(SCORE_TICKS_PER_QUARTER), bar(SCORE_TICKS_PER_QUARTER * 2)], 120)
    expect(clock.seconds[0]).toBeCloseTo(0.5)
    expect(clock.seconds[1]).toBeCloseTo(1)
  })

  it('applies a tempo change in the middle of the bar', () => {
    const ticks = SCORE_TICKS_PER_QUARTER * 4
    const clock = scoreClock([bar(ticks, [{ ratio: 0.5, bpm: 60 }])], 120)
    expect(clock.seconds[0]).toBeCloseTo(3)
    expect(clock.moments.map((moment) => moment.bpm)).toEqual([120, 60])
    expect(clock.moments[1]?.at).toBeCloseTo(1)
  })

  it('takes a tempo written on the downbeat before the bar is counted', () => {
    const clock = scoreClock([bar(SCORE_TICKS_PER_QUARTER * 4, [{ ratio: 0, bpm: 60 }])], 120)
    expect(clock.seconds[0]).toBeCloseTo(4)
    expect(clock.moments).toEqual([{ at: 0, bpm: 60, beats: 4, meter: '4/4' }])
  })
})

describe('song score block', () => {
  const block = (text: string) => ({ kind: 'score' as const, text })

  it('prefers a score that runs to the end of the file', () => {
    const whole = block('{x_titan_score: src="a.gp" track=1 start=1}')
    const excerpt = block('{x_titan_score: src="b.gp" track=1 start=17 end=24}')
    expect(songScoreBlock([excerpt, whole])).toBe(whole)
  })

  it('drops an explicit range once the file is known to be longer', () => {
    const partial = block('{x_titan_score: src="a.gp" track=1 start=1 end=8}')
    expect(songScoreBlock([partial])).toBe(partial)
    expect(songScoreBlock([partial], 8)).toBe(partial)
    expect(songScoreBlock([partial], 40)).toBeNull()
  })
})

describe('timeline exact seconds', () => {
  it('walks a score slice in the seconds it was given', () => {
    const music = { beats: 0, tail: 0, bars: 0, chords: 0, rows: 0 }
    const timeline = buildTimeline(
      [{ top: 40, h: 200, kind: 'score', music, seconds: 8 }],
      { bpm: 120, beatsPerBar: 4, durationSec: null, barPx: 20, doc: 240, viewport: 100 },
    )
    expect(timeline.bars).toBeCloseTo(8)
    expect(timeline.exact).toBeCloseTo(8)
  })
})
