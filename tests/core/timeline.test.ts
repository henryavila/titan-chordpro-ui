import { describe, expect, it } from 'vitest'
import {
  barsAtPx,
  beatsPerBar,
  BEATS_PER_ROW,
  buildTimeline,
  etaSec,
  formatEta,
  isPlayedLine,
  lineBeats,
  marksPerBeat,
  pxAtBars,
  runSec,
  sheetBpm,
  songDurationSec,
} from '../../src/core/timeline'
import type { TimelineBlock } from '../../src/core/timeline'

const music = (over: Partial<TimelineBlock['music']> = {}) => ({
  beats: 0,
  tail: 0,
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

describe('isPlayedLine', () => {
  it('reads an intro or interlude as played, not sung', () => {
    expect(isPlayedLine('[A]x///    [E]x///    [F#m]x///    [D]x///')).toBe(true)
    expect(isPlayedLine('[Dsus]x/[D]//')).toBe(true)
    // Chords with nothing sung under them are played too.
    expect(isPlayedLine('[G] [C] [D]')).toBe(true)
  })

  it('reads a sung line as sung, marks at the end and all', () => {
    expect(isPlayedLine('[D]Preciso ouvir Tua [A]voz a me falar [B]x///')).toBe(false)
    expect(isPlayedLine('[Esus]x/[E]//  [A]Não tenho nada a Te oferecer')).toBe(false)
    // The `[D]x` that used to shrink a whole chorus to one beat.
    expect(isPlayedLine('Dos peq[G6]uenos é o [A7]Reino dos [D]Céus [D]x')).toBe(false)
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
    expect(beatsPerBar('2/4')).toBe(2)
    expect(beatsPerBar(undefined)).toBe(4)
    expect(beatsPerBar('99/4')).toBe(4)
    expect(sheetBpm(72)).toBe(72)
    expect(sheetBpm('72')).toBe(72)
    expect(sheetBpm(5)).toBeNull()
    expect(sheetBpm(undefined)).toBeNull()
  })

  /**
   * The denominator used to be parsed and thrown away, which said a 6/8 bar
   * was six quarter notes — three times its real length. Every bar the clock
   * derives went with it: tabs, scores and the sung estimate.
   */
  it('counts a compound meter in its felt pulse, not its denominator', () => {
    // A 6/8 bar is two dotted quarters; 12/8 is four; 9/8 is three.
    expect(beatsPerBar('6/8')).toBe(2)
    expect(beatsPerBar('9/8')).toBe(3)
    expect(beatsPerBar('12/8')).toBe(4)
    // 3/8 is felt in three, like any simple meter.
    expect(beatsPerBar('3/8')).toBe(3)
    // Cut time counts half notes: two to the bar.
    expect(beatsPerBar('2/2')).toBe(2)
    expect(beatsPerBar('6/4')).toBe(6)
  })

  it('fits three x/// marks in a compound beat and one in a simple one', () => {
    expect(marksPerBeat('4/4')).toBe(1)
    expect(marksPerBeat('3/4')).toBe(1)
    expect(marksPerBeat('2/2')).toBe(1)
    expect(marksPerBeat('3/8')).toBe(1)
    expect(marksPerBeat('6/8')).toBe(3)
    expect(marksPerBeat('12/8')).toBe(3)
    expect(marksPerBeat(undefined)).toBe(1)
  })

  it('formats the remaining clock time', () => {
    expect(formatEta(200)).toBe('3:20')
    expect(formatEta(9)).toBe('0:09')
    expect(formatEta(0)).toBe('—')
  })
})

describe('buildTimeline', () => {
  const blocks: TimelineBlock[] = [
    // Intro: 8 beats played, no lyric of its own, short on screen.
    { top: 0, h: 100, kind: 'stanza', music: music({ beats: 8, chords: 2 }) },
    // Verse: nothing written, four sung rows, tall.
    { top: 100, h: 600, kind: 'stanza', music: music({ rows: 4, chords: 8 }) },
    // A label carries no music of its own.
    { top: 700, h: 40, kind: 'comment', music: music() },
  ]
  const opts = { bpm: 60, beatsPerBar: 4, durationSec: null, barPx: 44, doc: 740, viewport: 400 }

  it('spends the declared duration on the whole run', () => {
    const t = buildTimeline(blocks, { ...opts, durationSec: 200 })
    expect(t.bars).toBeCloseTo(200, 5)
    expect(runSec(t, 200)).toBeCloseTo(200, 5)

    const roomy: TimelineBlock[] = [
      { top: 0, h: 100, kind: 'stanza', music: music({ beats: 8, chords: 2 }) },
      { top: 100, h: 600, kind: 'stanza', music: music({ rows: 12, chords: 40 }) },
    ]
    const t2 = buildTimeline(roomy, { ...opts, durationSec: 200 })
    expect(t2.bars).toBeCloseTo(200, 5)
  })

  /**
   * The loop walks a fraction of `bars` in `runSec` seconds, so the two have to
   * be the same number. When they were not, every segment played at the ratio
   * between them — the counted intro included, which is the one thing that is
   * supposed to be exact.
   */
  it('closes the segments on the run, whatever the calibration does', () => {
    for (const dur of [null, 60, 200, 900]) {
      const t = buildTimeline(blocks, { ...opts, durationSec: dur })
      const sum = t.segs.reduce((a, s) => a + s.bars, 0)
      expect(sum).toBeCloseTo(t.bars, 5)
      expect(runSec(t, dur)).toBeCloseTo(sum, 5)
    }
  })

  it('keeps played time exact and calibrates only the sung estimate', () => {
    // 8 beats at 60 BPM = 8 s, in wall clock, whatever the chart declares.
    for (const dur of [null, 200, 900]) {
      const t = buildTimeline(blocks, { ...opts, durationSec: dur })
      expect(t.exact).toBeCloseTo(8, 5)
      expect(t.segs[0]?.bars).toBeCloseTo(8, 5)
      expect((t.segs[0]?.bars ?? 0) * (runSec(t, dur) / t.bars)).toBeCloseTo(8, 5)
    }
    expect(buildTimeline(blocks, { ...opts, durationSec: 200 }).k).not.toBe(1)
  })

  /**
   * The bug this whole layering exists to kill: one `[Am]x///` at the end of a
   * verse used to declare the entire verse four beats long, and a four-row
   * stanza went by in under two seconds.
   */
  it('adds a held tail to the sung rows instead of replacing them', () => {
    const one = { top: 0, h: 300, kind: 'stanza', music: music({ rows: 4 }) }
    const bare = buildTimeline([one], opts)
    const tailed = buildTimeline([{ ...one, music: music({ rows: 4, tail: 4 }) }], opts)
    // Four rows at BEATS_PER_ROW beats of 1 s each, plus 4 beats of tail.
    expect(bare.bars).toBeCloseTo(32, 5)
    expect(tailed.bars).toBeCloseTo(36, 5)
  })

  /**
   * A real 6/8 chart writes its intro as `[E]x//  [F#m7]x//  [D9]x//  [D9]x//`
   * twice over: half a bar per chord, four chords, two lines — four bars. At a
   * dotted quarter of 75 that is 6.4 s, and the clock has to say 6.4 s.
   */
  it('reads a compound-meter intro as the bars it actually writes', () => {
    const intro: TimelineBlock[] = [
      { top: 0, h: 172, kind: 'stanza', music: music({ beats: 24, chords: 8 }) },
    ]
    const six = buildTimeline(intro, {
      bpm: 75,
      beatsPerBar: beatsPerBar('6/8'),
      marksPerBeat: marksPerBeat('6/8'),
      durationSec: null,
      barPx: 44,
      doc: 172,
      viewport: 400,
    })
    expect(six.bars).toBeCloseTo(6.4, 3)
    // Four bars of 6/8, each two dotted quarters of 60/75 s.
    expect(six.bars).toBeCloseTo(4 * 2 * (60 / 75), 3)

    // The same 24 marks in 4/4 are 24 quarter notes — six bars, not four.
    const four = buildTimeline(intro, {
      bpm: 75,
      beatsPerBar: beatsPerBar('4/4'),
      marksPerBeat: marksPerBeat('4/4'),
      durationSec: null,
      barPx: 44,
      doc: 172,
      viewport: 400,
    })
    expect(four.bars).toBeCloseTo(24 * (60 / 75), 3)
  })

  /**
   * A sung phrase takes the time it takes; how the chart bars it up is a
   * different question. Estimating in bars made a 6/8 line half as long as a
   * 4/4 one for no musical reason.
   */
  it('estimates a sung row at the same musical length in any meter', () => {
    const verse: TimelineBlock[] = [
      { top: 0, h: 300, kind: 'stanza', music: music({ rows: 4 }) },
    ]
    const at = (time: string) =>
      buildTimeline(verse, {
        bpm: 75,
        beatsPerBar: beatsPerBar(time),
        marksPerBeat: marksPerBeat(time),
        durationSec: null,
        barPx: 44,
        doc: 300,
        viewport: 400,
      }).bars
    const expected = 4 * BEATS_PER_ROW * (60 / 75)
    for (const time of ['4/4', '3/4', '2/4', '6/8', '12/8']) {
      expect(at(time)).toBeCloseTo(expected, 3)
    }
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

  /**
   * The gap a block leaves under it belongs to no segment unless it is absorbed
   * into the one above, and the playhead jumped the whole gap in a single frame
   * at every block boundary.
   */
  /**
   * Bottom padding (chrome reserve, safe area) is still paper. Saturating
   * barsAtPx at the last measured box made a resume mid-page look like 100%.
   */
  it('owns the trailing pad under the last block, so mid-page is not the end', () => {
    const short: TimelineBlock[] = [
      { top: 40, h: 100, kind: 'stanza', music: music({ beats: 16 }) },
      { top: 180, h: 120, kind: 'stanza', music: music({ rows: 4 }) },
    ]
    const t = buildTimeline(short, { ...opts, doc: 800 })
    const last = t.segs[t.segs.length - 1]!
    expect(last.top + last.h).toBeCloseTo(800, 0)
    expect(pxAtBars(t, t.bars)).toBeCloseTo(800, 0)
    expect(barsAtPx(t, 400) / t.bars).toBeLessThan(0.9)
    expect(barsAtPx(t, 799) / t.bars).toBeGreaterThan(0.9)
  })

  it('crosses the gap between blocks instead of teleporting over it', () => {
    const spaced: TimelineBlock[] = [
      { top: 60, h: 100, kind: 'stanza', music: music({ beats: 40 }) },
      { top: 207, h: 100, kind: 'stanza', music: music({ beats: 40 }) },
    ]
    const t = buildTimeline(spaced, opts)
    // The first block owns the page above it and the 47px gap below it.
    expect(pxAtBars(t, 0)).toBe(0)
    const edge = t.segs[1]?.at ?? 0
    expect(pxAtBars(t, edge - 0.001)).toBeCloseTo(pxAtBars(t, edge), 0)
    // No step anywhere along the run.
    let prev = 0
    for (let i = 1; i <= 400; i++) {
      const px = pxAtBars(t, (t.bars * i) / 400)
      expect(px - prev).toBeLessThan(12)
      prev = px
    }
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
