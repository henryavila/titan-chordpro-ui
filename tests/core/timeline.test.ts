import { describe, expect, it } from 'vitest'
import {
  barsAtPx,
  beatsPerBar,
  buildTimeline,
  etaSec,
  formatEta,
  lineBeats,
  pxAtBars,
  runSec,
  sheetBpm,
  songDurationSec,
} from '../../src/core/timeline'
import type { TimelineBlock } from '../../src/core/timeline'

const music = (over: Partial<TimelineBlock['music']> = {}) => ({
  beats: 0,
  bars: 0,
  chords: 0,
  rows: 0,
  ...over,
})

describe('lineBeats', () => {
  it('counts the x/// strumming convention', () => {
    expect(lineBeats('[G]x///')).toBe(4)
    expect(lineBeats('[Dsus]x/ [D]//')).toBe(4)
    expect(lineBeats('[Gsus]x [G]/ [G9]/ [G]/      [G]x///')).toBe(8)
  })

  it('ignores slashes that are part of a chord or a word', () => {
    expect(lineBeats('[G/B]guio os meus pés')).toBe(0)
    expect(lineBeats('Por onde caminhar')).toBe(0)
    expect(lineBeats('')).toBe(0)
  })

  it('never counts a mark at the very start of the line', () => {
    // The design anchors on a preceding `]` or space; column 0 has neither.
    expect(lineBeats('x///')).toBe(3)
  })
})

describe('song clock helpers', () => {
  it('reads m:ss, mm:ss, h:mm:ss and plain seconds', () => {
    expect(songDurationSec('03:20')).toBe(200)
    expect(songDurationSec('4:26')).toBe(266)
    expect(songDurationSec('1:02:00')).toBe(3720)
    expect(songDurationSec('200')).toBe(200)
  })

  it('rejects nonsense durations instead of guessing', () => {
    expect(songDurationSec('')).toBeNull()
    expect(songDurationSec('abc')).toBeNull()
    expect(songDurationSec('5')).toBeNull()
    expect(songDurationSec(null)).toBeNull()
  })

  it('reads the time signature and the tempo', () => {
    expect(beatsPerBar('3/4')).toBe(3)
    expect(beatsPerBar('4/4')).toBe(4)
    expect(beatsPerBar(undefined)).toBe(4)
    expect(beatsPerBar('99/4')).toBe(4)
    expect(sheetBpm(72)).toBe(72)
    expect(sheetBpm('72')).toBe(72)
    expect(sheetBpm(5)).toBeNull()
    expect(sheetBpm(undefined)).toBeNull()
  })

  it('formats the remaining clock time', () => {
    expect(formatEta(200)).toBe('3:20')
    expect(formatEta(9)).toBe('0:09')
    expect(formatEta(0)).toBe('—')
  })
})

describe('buildTimeline', () => {
  const blocks: TimelineBlock[] = [
    // Intro: 8 beats written on the chart, short on screen.
    { top: 0, h: 100, kind: 'stanza', music: music({ beats: 8, rows: 1, chords: 2 }) },
    // Verse: nothing written, four rows, tall.
    { top: 100, h: 600, kind: 'stanza', music: music({ rows: 4, chords: 8 }) },
    // A label carries no music of its own.
    { top: 700, h: 40, kind: 'comment', music: music() },
  ]
  const opts = { bpm: 60, beatsPerBar: 4, durationSec: null, barPx: 44, doc: 740, viewport: 400 }

  it('spends the declared duration on the whole run', () => {
    // The calibration is capped at 4×, so a chart whose estimate is far below
    // the declared duration keeps its own shape — but the run still lasts
    // exactly as long as the chart says, because `runSec` is what the clock
    // divides by.
    const t = buildTimeline(blocks, { ...opts, durationSec: 200 })
    expect(runSec(t, 200)).toBe(200)

    // With an estimate in reach of the target, the timeline lands on it.
    const roomy: TimelineBlock[] = [
      { top: 0, h: 100, kind: 'stanza', music: music({ beats: 8, rows: 1, chords: 2 }) },
      { top: 100, h: 600, kind: 'stanza', music: music({ rows: 12, chords: 40 }) },
    ]
    const t2 = buildTimeline(roomy, { ...opts, durationSec: 200 })
    expect(t2.k).toBeGreaterThan(0.25)
    expect(t2.k).toBeLessThan(4)
    expect(t2.bars).toBeCloseTo(200, 0)
  })

  it('keeps counted time exact and calibrates only the estimate', () => {
    const t = buildTimeline(blocks, { ...opts, durationSec: 200 })
    // 8 beats at 60 BPM = 8 s, and that block is never stretched.
    expect(t.exact).toBeCloseTo(8, 5)
    expect(t.segs[0]?.bars).toBeCloseTo(8, 5)
    expect(t.k).not.toBe(1)
  })

  it('falls back to the chart’s own musical time with no duration', () => {
    const t = buildTimeline(blocks, opts)
    expect(t.bars).toBeGreaterThan(0)
    expect(runSec(t, null)).toBeCloseTo(t.bars, 5)
  })

  it('stops stretching when the counted time already exceeds the duration', () => {
    const counted: TimelineBlock[] = [
      { top: 0, h: 300, kind: 'stanza', music: music({ beats: 400, rows: 2 }) },
      { top: 300, h: 300, kind: 'stanza', music: music({ rows: 2, chords: 4 }) },
    ]
    const t = buildTimeline(counted, { ...opts, durationSec: 60 })
    expect(t.over).toBe(true)
    expect(t.k).toBe(1)
    // The declared duration is discarded rather than compressing real bars.
    expect(runSec(t, 60)).toBeGreaterThan(60)
  })

  it('maps musical time to pixels and back', () => {
    const t = buildTimeline(blocks, { ...opts, durationSec: 200 })
    expect(pxAtBars(t, 0)).toBe(0)
    expect(pxAtBars(t, t.bars)).toBeCloseTo(740, 0)
    const mid = pxAtBars(t, t.bars / 2)
    expect(barsAtPx(t, mid)).toBeCloseTo(t.bars / 2, 3)
  })

  it('never divides by zero on an empty chart', () => {
    const t = buildTimeline([], { ...opts, doc: 900 })
    expect(t.segs).toHaveLength(1)
    expect(t.bars).toBeGreaterThan(0)
    expect(pxAtBars(t, 0)).toBe(0)
  })

  it('reports remaining time from the playhead fraction and the speed', () => {
    const t = buildTimeline(blocks, { ...opts, durationSec: 200 })
    expect(etaSec(t, 200, 0, 1)).toBeCloseTo(200, 0)
    expect(etaSec(t, 200, 0.5, 1)).toBeCloseTo(100, 0)
    expect(etaSec(t, 200, 0.5, 2)).toBeCloseTo(50, 0)
    expect(etaSec(t, 200, 1, 1)).toBe(0)
  })
})
