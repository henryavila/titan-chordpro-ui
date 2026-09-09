import { describe, expect, it } from 'vitest'
import {
  anchorPx,
  buildTimeline,
  clockOf,
  layoutChart,
  parse,
  pxAtBars,
  pxAtScroll,
  runSec,
  scrollAtPx,
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

/**
 * Where the page IS, in seconds, on real charts.
 *
 * The clock above says how long each stretch of paper lasts. This says what
 * the reader actually sees, which is a different question and the one that was
 * wrong: with the whole clock correct to the second, the page stood dead still
 * for 25 to 96 seconds at the start of every chart in the corpus — a third of
 * `entrega-2` and half of `088-minha-ofertinha`, a chart with 29px of scroll
 * in it. The anchor asked for half a viewport of paper before it would move,
 * and half a viewport is the intro plus most of the first verse.
 */
describe('where the page is', () => {
  const PHONE = 860

  /** Scroll offset at a given second, the way the RAF loop computes it. */
  function pageAt(rel: string, viewport = PHONE) {
    const { blocks, clock, t, run } = timelineOf(rel)
    let doc = 0
    for (const b of blocks) doc += heightOf(b) + GAP
    const anchor = anchorPx(viewport, doc)
    const max = Math.max(0, doc - viewport)
    return {
      run,
      max,
      anchor,
      at: (sec: number) =>
        Math.min(max, scrollAtPx(pxAtBars(t, (sec / run) * t.bars), anchor)),
    }
  }

  const CORPUS = [
    'entrega-1.cho',
    'entrega-2.cho',
    'escuta-meu-clamor-sda-86.cho',
    'jesus-tu-es-a-minha-vida-1.cho',
    'ministerio-tons/002-em-gratidao.cho',
    'ministerio-tons/010-adoralo.cho',
    'ministerio-tons/013-ele-vive-em-mim.cho',
    'ministerio-tons/060-deixai-vir-pequeninos-h588.cho',
    'ministerio-tons/088-minha-ofertinha.cho',
    'ministerio-tons/094-maranata-ja-2024.cho',
  ]

  it('never freezes the chart at the start — every chart is moving inside a second', () => {
    for (const rel of CORPUS) {
      const p = pageAt(rel)
      // A chart shorter than the frame has nothing to scroll, and saying so is
      // the honest answer; every other chart must be visibly alive at once.
      if (p.max < 1) continue
      expect(p.at(1), rel).toBeGreaterThan(0)
    }
  })

  it('has covered a readable distance by the time the intro is over', () => {
    for (const rel of CORPUS) {
      const p = pageAt(rel)
      if (p.max < 1) continue
      // 30s in — past the intro of every chart in the corpus — the page has
      // moved a line of chart, or all the paper the chart has, whichever comes
      // first: `088-minha-ofertinha` is 29px taller than the frame in total.
      expect(p.at(30), rel).toBeGreaterThanOrEqual(Math.min(40, p.max))
    }
  })

  it('never asks a chart for more room than it has', () => {
    for (const rel of CORPUS) {
      const p = pageAt(rel)
      expect(p.anchor, rel).toBeLessThanOrEqual(p.max)
    }
  })

  it('reaches the end of the paper by the end of the song', () => {
    for (const rel of CORPUS) {
      const p = pageAt(rel)
      expect(p.at(p.run), rel).toBeCloseTo(p.max, 0)
    }
  })

  it('never runs the page backwards', () => {
    for (const rel of CORPUS) {
      const p = pageAt(rel)
      let prev = -1
      for (let s = 0; s <= p.run; s += p.run / 200) {
        const now = p.at(s)
        expect(now, `${rel} at ${s.toFixed(1)}s`).toBeGreaterThanOrEqual(prev)
        prev = now
      }
    }
  })

  /**
   * A drag has to land the playhead where the reader put it, or the chart
   * jumps back the moment the loop takes over again.
   */
  it('reads a dragged position back to the music that is showing', () => {
    for (const anchor of [0, 40, 292]) {
      for (const px of [0, 10, 120, 400, 2000]) {
        expect(pxAtScroll(scrollAtPx(px, anchor), anchor)).toBeCloseTo(px, 6)
      }
    }
  })

  it('rests the music a third down the frame once there is room for it', () => {
    // Tall chart, deep into the song: the anchor is fully built.
    const anchor = anchorPx(PHONE, 4000)
    expect(anchor).toBe(292)
    const px = 2000
    expect(px - scrollAtPx(px, anchor)).toBe(anchor)
  })
})
