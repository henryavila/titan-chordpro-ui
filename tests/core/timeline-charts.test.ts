import { describe, expect, it } from 'vitest'
import {
  anchorPx,
  barsAtPx,
  buildTimeline,
  clockOf,
  layoutChart,
  parse,
  pxAtBars,
  pxAtScroll,
  runSec,
  scrollAtPlayhead,
  scrollAtPx,
  typeScale,
} from '../../src/core/index'
import type { ChartBlock, TimelineBlock } from '../../src/core/index'
import { loadFixture } from '../helpers/load-fixture'
import { markBeatsBefore } from '../helpers/autoscroll-real-data'

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
 *
 * Expected seconds: `{duration:}`, `{tempo:}`, `x///` in the fixture — never
 * the unmarked-row placeholder. Gate: `autoscroll-no-estimates.test.ts`.
 */
const scale = typeScale(0, false, 900, 40, false)
const GAP = Number(String(scale.blockGap).replace('px', ''))

function heightOf(b: ChartBlock, barPx = scale.barPx): number {
  if (b.kind === 'stanza' || b.kind === 'chorus') return b.rows.length * barPx
  if (b.kind === 'tab') return 140
  if (b.kind === 'score') return 220
  if (b.kind === 'note') return 28 + b.items.length * 22
  return 30
}

function timelineOf(rel: string, opts?: { topPad?: number; bottomPad?: number; viewport?: number; width?: number }) {
  const view = parse(loadFixture(rel))
  const blocks = layoutChart(view)
  const clock = clockOf(view)
  const width = opts?.width ?? 900
  const local = typeScale(0, false, width, 40, false)
  const gap = Number(String(local.blockGap).replace('px', ''))
  let top = opts?.topPad ?? 0
  const measured: TimelineBlock[] = blocks.map((b) => {
    const h = heightOf(b, local.barPx)
    const tb = { top, h, music: b.music, kind: b.kind }
    top += h + gap
    return tb
  })
  const doc = top + (opts?.bottomPad ?? 0)
  const viewport = opts?.viewport ?? 700
  const t = buildTimeline(measured, {
    bpm: clock.bpm,
    beatsPerBar: clock.beatsPerBar,
    marksPerBeat: clock.marksPerBeat,
    durationSec: clock.durationSec,
    barPx: local.barPx,
    doc,
    viewport,
  })
  return { blocks, clock, t, run: runSec(t, clock.durationSec), measured, doc, viewport }
}

/** Seconds a block really lasts on screen, at 1×. */
function wall(rel: string) {
  const { blocks, t, run, measured } = timelineOf(rel)
  const stretch = run / t.bars
  return blocks.map((b, i) => {
    const top = measured[i]?.top ?? 0
    const bot = measured[i + 1]?.top ?? t.doc
    return { block: b, sec: (barsAtPx(t, bot) - barsAtPx(t, top)) * stretch }
  })
}

describe('the clock on real charts', () => {
  /**
   * `x///` on a played line is the one exact duration a chart offers, and it is
   * written where it matters most: the intro and the interlude, which carry
   * height and no words to pace them. Those beats ARE the scroll time there.
   */
  it('spends the written bars of an intro at the chart’s BPM, to the second', () => {
    const { blocks, t, measured } = timelineOf('sda/013-ele-vive-em-mim.cho')
    const span = (i: number, from = i) =>
      barsAtPx(t, measured[i + 1]?.top ?? t.doc) - barsAtPx(t, measured[from]?.top ?? 0)
    const intro = blocks.findIndex((b) => b.music.beats === 32)
    expect(intro).toBeGreaterThan(0)
    // 72 BPM: one beat is 60/72 s. The 32-beat intro is 26.7 s of wall clock,
    // not a number the page invented — and not 26.7 s plus the "INTRODUÇÃO"
    // label, which used to sit on the clock as average-pace paper.
    expect(span(intro)).toBeCloseTo(32 * (60 / 72), 2)
    const inter = blocks.findIndex((b, i) => i > intro && b.music.beats === 16)
    expect(inter).toBeGreaterThan(0)
    expect(blocks[inter - 1]?.kind).toBe('comment')
    expect(span(inter, inter - 1)).toBeCloseTo(16 * (60 / 72), 2)
  })

  /**
   * The regression: one `[Am]x///` closing a verse used to declare the whole
   * verse four beats long, and `[D]x` — a typo — did it to a chorus.
   */
  it('never lets a mark on a sung line swallow the rows it sits on', () => {
    for (const rel of [
      'sda/088-minha-ofertinha.cho',
      'sda/060-deixai-vir-a-mim-os-pequeninos-h588.cho',
      'sda/078-entrega-h310.cho',
    ]) {
      const { clock } = timelineOf(rel)
      const beat = 60 / clock.bpm
      for (const { block, sec } of wall(rel)) {
        if (block.kind !== 'stanza' && block.kind !== 'chorus') continue
        if (!block.music.rows) continue
        // A tail mark must not become the whole verse: time > the marks written
        // on that block (x/// / //). Unmarked rows still take {duration:} share.
        expect(sec).toBeGreaterThan(block.music.tail * beat)
      }
    }
  })

  /**
   * Two choruses of the same shape must roll at the same pace. A stray mark
   * used to declare the whole second chorus one beat long.
   */
  it('rolls repeats of the same block at the same pace', () => {
    const [first, second] = wall('sda/002-em-gratidao.cho')
      .filter((x) => x.block.kind === 'chorus')
      .map((x) => x.sec)
    expect(first).toBeGreaterThan(0)
    expect(second).toBeCloseTo(first ?? 0, 4)
  })

  /**
   * The loop advances the playhead by `dt / runSec` and reads the position out
   * of `bars`. If the two disagree the whole chart plays at the ratio between
   * them, silently — which is how a counted intro ended up 1.9× slow.
   */
  it('keeps the run and the timeline the same number, on every chart', () => {
    for (const rel of [
      'sda/078-entrega-h310.cho',
      'sda/002-em-gratidao.cho',
      'sda/013-ele-vive-em-mim.cho',
      'sda/088-minha-ofertinha.cho',
      'sda/087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho',
      'sda/010-adora-lo.cho',
      'sda/052-fidelidade-e-missao.cho',
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
  /**
   * 087 — Jesus, Tu És a minha vida. A musician who starts on the downbeat
   * after the count-in is at "Jesus, Tu És meu Pai querido" after the written
   * intro, two interludes and five four-line stanzas: 218 s at the chart's
   * 60 BPM. The clock used to spend 54 s on "BEM SUAVE", "INTRODUÇÃO" and the
   * chrome pad first, so on a phone that line was still below the fold.
   */
  /**
   * 088 is 4/4 at 136. Sixteen `x///` marks on the intro are four bars of
   * quarter notes, not eight bars of 2/4. Unmarked `[C] [F] [C]` on a lyric
   * is not duration — those rows follow `{duration:}`.
   */
  it('reads 088 in 4/4 and does not guess duration from unmarked chords', () => {
    const { blocks, clock, t } = timelineOf('sda/088-minha-ofertinha.cho')
    expect(clock.beatsPerBar).toBe(4)
    expect(clock.marksPerBeat).toBe(1)
    expect(clock.bpm).toBe(136)
    expect(clock.durationSec).toBe(72)
    const intro = blocks.find((b) => b.music.beats === 16)
    expect(intro).toBeDefined()
    expect(16 / clock.beatsPerBar).toBe(4)
    const beat = 60 / clock.bpm
    const sung = blocks.filter((b) => b.music.rows > 0)
    const tails = sung.reduce((a, b) => a + b.music.tail, 0)
    const played = blocks.reduce((a, b) => a + b.music.beats, 0)
    // Exact layer: written marks only. Sung rows fill the rest of {duration:}.
    expect(t.exact).toBeCloseTo((played + tails) * beat, 3)
    expect(t.est).toBeCloseTo(72 - t.exact, 3)
  })

  it('has Pai querido on a phone screen when the musician gets there', () => {
    const PHONE = 700
    const { blocks, t, run, measured, clock } = timelineOf(
      'sda/087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho',
      {
        topPad: 100,
        bottomPad: 178,
        viewport: PHONE,
        width: 390,
      },
    )
    const idx = blocks.findIndex(
      (b) => b.kind === 'stanza' && b.rows.some((r) => /Pai que/i.test(r.plain)),
    )
    expect(idx).toBeGreaterThan(0)
    const line = measured[idx]
    expect(line).toBeDefined()
    const arrive = barsAtPx(t, line!.top)
    const src = loadFixture('sda/087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho')
    const marksBefore = markBeatsBefore(src, /Pai que/)
    const beat = 60 / clock.bpm
    // Marks written above that line, at {tempo:}. Comments used to add 54 s
    // and push it past {duration: 04:20}.
    expect(arrive).toBeGreaterThan(marksBefore * beat)
    expect(arrive).toBeLessThan(clock.durationSec ?? run)
    const scroll = scrollAtPlayhead(t, arrive / run, PHONE)
    expect(line!.top).toBeGreaterThanOrEqual(scroll)
    expect(line!.top).toBeLessThan(scroll + PHONE - 80)
    expect(run).toBeCloseTo(clock.durationSec ?? run, 1)
  })

  it('holds one recognisable pace across a chart', () => {
    for (const rel of [
      'sda/010-adora-lo.cho',
      'sda/013-ele-vive-em-mim.cho',
      'sda/052-fidelidade-e-missao.cho',
      'sda/078-entrega-h310.cho',
      'sda/087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho',
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
      at: (sec: number) => scrollAtPlayhead(t, run > 0 ? sec / run : 0, viewport),
    }
  }

  const CORPUS = [
    'sda/078-entrega-h310.cho',
    'sda/084-escuta-meu-clamor.cho',
    'sda/087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho',
    'sda/002-em-gratidao.cho',
    'sda/010-adora-lo.cho',
    'sda/013-ele-vive-em-mim.cho',
    'sda/060-deixai-vir-a-mim-os-pequeninos-h588.cho',
    'sda/088-minha-ofertinha.cho',
    'sda/094-maranata-ja-2024.cho',
    'sda/001-tudo-que-ha-de-bom-em-mim.cho',
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
