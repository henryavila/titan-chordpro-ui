import { describe, expect, it } from 'vitest'
import {
  buildTimeline,
  clockOf,
  layoutChart,
  parse,
  runSec,
  typeScale,
} from '../../src/core/index'
import type { ChartBlock, TimelineBlock } from '../../src/core/index'
import { loadFixture } from '../helpers/load-fixture'

/**
 * The clock, measured on real charts.
 *
 * Every assertion here is about wall clock — seconds a musician spends on a
 * stretch of paper — because that is the only unit the bug lived in. The unit
 * tests next door assert the timeline's internals and all passed happily while
 * a four-row verse went by in 1.8 seconds.
 *
 * Heights stand in for the DOM: a sung row is one `barPx`, and the blocks are
 * laid out with the real `blockGap` between them.
 */
const scale = typeScale(0, false, 900, 40, false)
const GAP = Number(String(scale.blockGap).replace('px', ''))

function heightOf(b: ChartBlock): number {
  if (b.kind === 'stanza' || b.kind === 'chorus') return b.rows.length * scale.barPx
  if (b.kind === 'tab') return 140
  if (b.kind === 'score') return 220
  return 30
}

function timelineOf(rel: string) {
  const view = parse(loadFixture(rel))
  const blocks = layoutChart(view)
  const clock = clockOf(view)
  let top = 0
  const measured: TimelineBlock[] = blocks.map((b) => {
    const h = heightOf(b)
    const tb = { top, h, music: b.music, kind: b.kind }
    top += h + GAP
    return tb
  })
  const t = buildTimeline(measured, {
    bpm: clock.bpm,
    beatsPerBar: clock.beatsPerBar,
    durationSec: clock.durationSec,
    barPx: scale.barPx,
    doc: top,
    viewport: 700,
  })
  return { blocks, clock, t, run: runSec(t, clock.durationSec) }
}

/** Seconds a block really lasts on screen, at 1×. */
function wall(rel: string) {
  const { blocks, t, run } = timelineOf(rel)
  const stretch = run / t.bars
  return blocks.map((b, i) => ({ block: b, sec: (t.segs[i]?.bars ?? 0) * stretch }))
}

describe('the clock on real charts', () => {
  /**
   * `x///` on a played line is the one exact duration a chart offers, and it is
   * written where it matters most: the intro and the interlude, which carry
   * height and no words to pace them. Those beats ARE the scroll time there.
   */
  it('spends the written bars of an intro at the chart’s BPM, to the second', () => {
    const { blocks, t, run } = timelineOf('ministerio-tons/013-ele-vive-em-mim.cho')
    const stretch = run / t.bars
    const played = blocks
      .map((b, i) => ({ b, sec: (t.segs[i]?.bars ?? 0) * stretch }))
      .filter((x) => x.b.music.beats > 0)
    expect(played.length).toBeGreaterThanOrEqual(3)
    // 72 BPM: one beat is 60/72 s, and the chart's own count sets the time.
    for (const { b, sec } of played) expect(sec).toBeCloseTo(b.music.beats * (60 / 72), 4)
    // The 32-beat intro of this chart: 26.7 s, not a number the page invented.
    expect(played[0]?.sec).toBeCloseTo(26.667, 2)
  })

  /**
   * The regression: one `[Am]x///` closing a verse used to declare the whole
   * verse four beats long, and `[D]x` — a typo — did it to a chorus.
   */
  it('never lets a mark on a sung line swallow the rows it sits on', () => {
    for (const rel of [
      'ministerio-tons/088-minha-ofertinha.cho',
      'ministerio-tons/060-deixai-vir-pequeninos-h588.cho',
      'entrega-1.cho',
    ]) {
      for (const { block, sec } of wall(rel)) {
        if (block.kind !== 'stanza' && block.kind !== 'chorus') continue
        if (!block.music.rows) continue
        // No sung line is ever crossed faster than two seconds.
        expect(sec / block.music.rows).toBeGreaterThan(2)
      }
    }
  })

  /**
   * Two choruses of the same shape must roll at the same pace. In
   * `060-deixai-vir` they did not: the second one ends on a stray `[D]x` and
   * that single character used to declare the whole chorus one beat long — it
   * went by 44× faster than the chorus above it, at 341 px/s.
   *
   * Read as a tail, the mark says what it always said: hold one more beat. At
   * 82 BPM that is 0.73 s of difference between the two, and nothing more.
   */
  it('rolls repeats of the same block at the same pace', () => {
    const [first, second] = wall('ministerio-tons/060-deixai-vir-pequeninos-h588.cho')
      .filter((x) => x.block.kind === 'chorus')
      .map((x) => x.sec)
    expect(first).toBeGreaterThan(0)
    expect(second).toBeCloseTo((first ?? 0) + 60 / 82, 4)
  })

  /**
   * The loop advances the playhead by `dt / runSec` and reads the position out
   * of `bars`. If the two disagree the whole chart plays at the ratio between
   * them, silently — which is how a counted intro ended up 1.9× slow.
   */
  it('keeps the run and the timeline the same number, on every chart', () => {
    for (const rel of [
      'entrega-1.cho',
      'entrega-2.cho',
      'entrega-3.cho',
      'ministerio-tons/002-em-gratidao.cho',
      'ministerio-tons/013-ele-vive-em-mim.cho',
      'ministerio-tons/088-minha-ofertinha.cho',
      'jesus-tu-es-a-minha-vida-1.cho',
    ]) {
      const { t, run, clock } = timelineOf(rel)
      expect(run).toBeCloseTo(t.bars, 5)
      // A declared duration is what the run lasts, not a hint.
      if (clock.durationSec && !t.over) expect(run).toBeCloseTo(clock.durationSec, 3)
    }
  })

  /**
   * Pixels per second may vary — a held interlude crosses fewer pixels than a
   * dense verse, and that is the point of a musical clock. What it may not do
   * is lurch: before the layering, one chart ran from 4.9 px/s to 291 px/s.
   */
  it('holds one recognisable pace across a chart', () => {
    for (const rel of [
      'ministerio-tons/010-adoralo.cho',
      'ministerio-tons/013-ele-vive-em-mim.cho',
      'ministerio-tons/052-fidelidade-e-missao.cho',
      'entrega-1.cho',
      'jesus-tu-es-a-minha-vida-1.cho',
    ]) {
      const speeds = wall(rel)
        .filter((x) => x.block.music.rows > 0 && x.sec > 0)
        .map((x) => heightOf(x.block) / x.sec)
      const fastest = Math.max(...speeds)
      const slowest = Math.min(...speeds)
      expect(fastest / slowest).toBeLessThan(4)
    }
  })
})
