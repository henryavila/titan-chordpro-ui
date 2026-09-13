import { describe, expect, it } from 'vitest'
import {
  ANCHOR_RAMP,
  barsAtPx,
  buildTimeline,
  clockOf,
  contentOrigin,
  layoutChartFull,
  maxPlainChars,
  parse,
  playheadAtScroll,
  pxAtBars,
  pxAtScroll,
  runSec,
  scrollAtPlayhead,
  scrollAtPx,
  typeScale,
  type ChartBlock,
  type Timeline,
  type TimelineBlock,
} from '../../src/core/index'
import { loadFixture } from '../helpers/load-fixture'
import {
  AUTOSCROLL_CORPUS,
  BASE_SURFACE,
  SCROLL_SURFACES,
  type ScrollSurface,
} from '../helpers/autoscroll-corpus'

/**
 * Clock expected values: `{duration:}`, `{tempo:}`, `{time:}`, `x///` counted
 * in the fixture. Never the unmarked-row placeholder. Gate:
 * `autoscroll-no-estimates.test.ts`.
 */

function surfaceOf(patch: Partial<ScrollSurface> = {}): ScrollSurface {
  return { ...BASE_SURFACE, ...patch }
}

function rowHeight(b: ChartBlock, scale: ReturnType<typeof typeScale>): number {
  if (b.kind !== 'stanza' && b.kind !== 'chorus') {
    if (b.kind === 'tab') return 140
    if (b.kind === 'score') return 220
    if (b.kind === 'note') return 28 + b.items.length * 22
    if (b.kind === 'image') return 180
    return 30
  }
  const lyric = parseFloat(scale.lyricPx)
  const chord = parseFloat(scale.chordPx)
  const lane = b.shapeCapo > 0 ? 2.55 : 1.4
  const extra = parseFloat(scale.rowPad) * 2
  return Math.max(24, b.rows.length * (lyric * 1.15 + chord * lane + extra))
}

function layoutOf(rel: string, s: ScrollSurface) {
  const view = parse(loadFixture(rel))
  const laid = layoutChartFull(view, { capo: s.capo, dual: s.dual })
  const clock = clockOf(view)
  const scale = typeScale(0, s.fit, s.width, maxPlainChars(laid.blocks), laid.twin)
  const gap = Number(String(scale.blockGap).replace('px', ''))
  // Legend sits in the page above the first [data-block], like chrome pad:
  // paper the musician sees, not a musical block.
  let top = s.topPad + (laid.legend ? 52 : 0)
  const measured: TimelineBlock[] = laid.blocks.map((b) => {
    const h = rowHeight(b, scale)
    const tb = { top, h, music: b.music, kind: b.kind }
    top += h + gap
    return tb
  })
  const doc = top + s.bottomPad
  const t = buildTimeline(measured, {
    bpm: clock.bpm,
    beatsPerBar: clock.beatsPerBar,
    marksPerBeat: clock.marksPerBeat,
    durationSec: clock.durationSec,
    barPx: scale.barPx,
    doc,
    viewport: s.viewport,
  })
  return { view, laid, clock, scale, measured, t, run: runSec(t, clock.durationSec), doc, surface: s }
}

/** Musical time at the top of each musical fold-group (the clock the musician hears). */
function finishTimes(t: Timeline, measured: TimelineBlock[]): number[] {
  const out: number[] = []
  for (let i = 0; i < measured.length; i++) {
    const b = measured[i]
    if (!b) continue
    const silent = b.kind === 'comment' || b.kind === 'note' || b.kind === 'image'
    const hasMusic = b.music.beats + (b.music.tail || 0) + b.music.rows + b.music.bars > 0
    if (silent && !hasMusic) continue
    const next = measured.slice(i + 1).find((x) => {
      const s = x.kind === 'comment' || x.kind === 'note' || x.kind === 'image'
      const m = x.music.beats + (x.music.tail || 0) + x.music.rows + x.music.bars > 0
      return !s || m
    })
    const at = barsAtPx(t, next ? next.top : t.doc)
    out.push(at)
  }
  return out
}

describe('chrome pad is not music', () => {
  const rel = 'sda/013-ele-vive-em-mim.cho'

  it('does not spend intro time walking the chrome above the first block', () => {
    const { t, measured } = layoutOf(rel, surfaceOf({ topPad: 120 }))
    const first = measured[0]
    expect(first).toBeDefined()
    expect(barsAtPx(t, first!.top)).toBeCloseTo(0, 5)
    expect(pxAtBars(t, 0)).toBe(first!.top)
  })

  it('keeps the written intro the same with no pad and with a tall chrome', () => {
    const bare = layoutOf(rel, surfaceOf({ topPad: 0 }))
    const padded = layoutOf(rel, surfaceOf({ topPad: 160 }))
    const beat = 60 / bare.clock.bpm
    const intro = bare.laid.blocks.findIndex((b) => b.music.beats === 32)
    expect(intro).toBeGreaterThan(0)
    const span = (pack: ReturnType<typeof layoutOf>, i: number) =>
      barsAtPx(pack.t, pack.measured[i + 1]?.top ?? pack.t.doc) - barsAtPx(pack.t, pack.measured[i]?.top ?? 0)
    // 32 marks on the two intro lines of 013, at {tempo:72}.
    expect(span(bare, intro)).toBeCloseTo(32 * beat, 2)
    expect(span(padded, intro)).toBeCloseTo(32 * beat, 2)
  })

  it('starts the page at scroll 0 even when the first block is below the pad', () => {
    const { t, measured, surface } = layoutOf(rel, surfaceOf({ topPad: 100 }))
    expect(contentOrigin(t)).toBe(measured[0]?.top)
    expect(scrollAtPlayhead(t, 0, surface.viewport)).toBe(0)
    expect(playheadAtScroll(t, 0, surface.viewport)).toBeCloseTo(0, 5)
  })
})

describe('scrollAtPx origin (chrome isolation)', () => {
  it('reduces to the old formula when origin is 0', () => {
    expect(scrollAtPx(200, 292)).toBe(scrollAtPx(200, 292, 0))
    expect(pxAtScroll(80, 292)).toBeCloseTo(pxAtScroll(80, 292, 0), 10)
  })

  it('inverts for any origin the chrome can take', () => {
    for (const origin of [0, 48, 80, 120, 160, 292]) {
      for (const anchor of [40, 200, 292]) {
        for (const px of [origin, origin + 10, origin + 400, origin + 2000]) {
          const s = scrollAtPx(px, anchor, origin)
          expect(pxAtScroll(s, anchor, origin)).toBeCloseTo(Math.max(origin, px), 6)
        }
      }
    }
  })

  it('does not jump at t=0 when the music already sits below the top', () => {
    expect(scrollAtPx(100, 292, 100)).toBe(0)
    const later = scrollAtPx(100 + 80, 292, 100)
    expect(later).toBeCloseTo(80 * (1 - ANCHOR_RAMP), 5)
  })
})

describe('the clock is the same music on every UI surface', () => {
  /**
   * Mutation that would break these: absorb chrome pad into the first
   * segment again, or let capo/dual/fit change BlockMusic.
   */
  it('never spends clock time above the first block — pad, legend and all', () => {
    for (const chart of AUTOSCROLL_CORPUS) {
      for (const { name, patch } of SCROLL_SURFACES) {
        const { t, measured } = layoutOf(chart.rel, surfaceOf(patch))
        const first = measured[0]
        if (!first) continue
        expect(barsAtPx(t, first.top), `${chart.rel} ${name}`).toBeCloseTo(0, 5)
        expect(pxAtBars(t, 0), `${chart.rel} ${name}`).toBe(first.top)
      }
    }
  })

  it('keeps each chart’s run on {duration:} in every surface, when the chart is not over', () => {
    for (const chart of AUTOSCROLL_CORPUS) {
      const times: number[] = []
      let over = false
      for (const { patch } of SCROLL_SURFACES) {
        const { t, run, clock } = layoutOf(chart.rel, surfaceOf(patch))
        if (t.over) over = true
        times.push(run)
        expect(run).toBeCloseTo(t.bars, 5)
        if (clock.durationSec && !t.over) expect(run).toBeCloseTo(clock.durationSec, 3)
      }
      if (over) continue
      const a = times[0]
      if (a == null) continue
      for (const n of times) expect(n).toBeCloseTo(a, 3)
    }
  })

  it('keeps counted music and the run identical across surfaces', () => {
    for (const chart of AUTOSCROLL_CORPUS) {
      const rows = SCROLL_SURFACES.map(({ name, patch }) => {
        const { t, run, clock } = layoutOf(chart.rel, surfaceOf(patch))
        return { name, exact: t.exact, run, over: t.over, durationSec: clock.durationSec }
      })
      const ref = rows[0]
      if (!ref) continue
      for (const other of rows.slice(1)) {
        expect(other.exact, `${chart.rel} ${other.name} exact`).toBeCloseTo(ref.exact, 5)
        expect(other.run, `${chart.rel} ${other.name} run`).toBeCloseTo(ref.run, 3)
      }
    }
  })

  it('finishes each musical stretch in the same bar of the song, whatever the paper looks like', () => {
    for (const chart of AUTOSCROLL_CORPUS) {
      const bySurface = SCROLL_SURFACES.map(({ name, patch }) => {
        const { t, measured, run } = layoutOf(chart.rel, surfaceOf(patch))
        return { name, times: finishTimes(t, measured), run }
      })
      const ref = bySurface[0]
      if (!ref) continue
      // The 2.2× ceiling is the one place pixels feed back into the clock:
      // a taller page (sem ajuste, dual) binds sooner. A stolen intro was 4–25 s;
      // a ceiling nudge is under 2% of the run (1.4 s on 088, ~5 s on a 4 min chart).
      const tol = Math.max(1.2, ref.run * 0.02)
      for (const other of bySurface.slice(1)) {
        expect(other.times.length, `${chart.rel} ${other.name}`).toBe(ref.times.length)
        for (let i = 0; i < ref.times.length; i++) {
          expect(
            Math.abs((other.times[i] ?? 0) - (ref.times[i] ?? 0)),
            `${chart.rel} ${other.name} stretch ${i}`,
          ).toBeLessThanOrEqual(tol)
        }
      }
    }
  })

  /**
   * 009 — `{duration: 02:40}` is in the file. A musician has not finished the
   * first stanza at 20 s. Parking leftover time on the last screen sent that
   * stanza off the top mid-verse.
   */
  it('keeps 009’s first verse on screen long enough to sing it, without fit', () => {
    const { t, measured, clock, run, surface } = layoutOf(
      'sda/009-verdadeira-alegria.cho',
      surfaceOf({ fit: false, width: 390, viewport: 844, topPad: 96 }),
    )
    expect(clock.durationSec).toBe(160)
    expect(run).toBeCloseTo(160, 1)
    const from = measured[0]?.top ?? 0
    const until = measured[1]?.top ?? t.doc
    const verseSec = barsAtPx(t, until) - barsAtPx(t, from)
    expect(verseSec).toBeGreaterThan(25)
    expect(barsAtPx(t, until)).toBeGreaterThan(20)
    const scroll = scrollAtPlayhead(t, 20 / run, surface.viewport)
    const firstBottom = from + (measured[0]?.h ?? 0)
    expect(firstBottom - scroll).toBeGreaterThan(40)
  })

  it('keeps a counted intro exact at the chart BPM across capo, dual, fit and pad', () => {
    const rel = 'sda/013-ele-vive-em-mim.cho'
    const expected = 32 * (60 / 72)
    for (const { name, patch } of SCROLL_SURFACES) {
      const { t, measured, laid } = layoutOf(rel, surfaceOf(patch))
      const intro = laid.blocks.findIndex((b) => b.music.beats === 32)
      expect(intro, name).toBeGreaterThan(0)
      const from = measured[intro]?.top ?? 0
      const until = measured[intro + 1]?.top ?? t.doc
      // Comments above the intro ride with it: the GROUP ends at `until`.
      // The intro box itself must not have had chrome eaten out of its 26.7 s.
      expect(barsAtPx(t, until) - barsAtPx(t, from), name).toBeCloseTo(expected, 2)
    }
  })

  it('never freezes, never runs backwards, and reaches the end of the paper', () => {
    for (const chart of AUTOSCROLL_CORPUS) {
      for (const { name, patch } of SCROLL_SURFACES) {
        const { t, run, doc, surface } = layoutOf(chart.rel, surfaceOf(patch))
        const max = Math.max(0, doc - surface.viewport)
        const label = `${chart.rel} ${name}`
        expect(scrollAtPlayhead(t, 0, surface.viewport), label).toBe(0)
        expect(scrollAtPlayhead(t, 1, surface.viewport), label).toBeCloseTo(max, 0)
        if (max < 1) continue
        expect(scrollAtPlayhead(t, Math.min(1, 1 / Math.max(run, 1)), surface.viewport), `${label} at 1s`).toBeGreaterThan(
          0,
        )
        let prev = -1
        for (let i = 0; i <= 80; i++) {
          const now = scrollAtPlayhead(t, i / 80, surface.viewport)
          expect(now, `${label} u=${i / 80}`).toBeGreaterThanOrEqual(prev)
          prev = now
        }
      }
    }
  })

  it('reads a dragged scroll back to the same playhead it would write', () => {
    for (const chart of AUTOSCROLL_CORPUS) {
      const { t, surface, doc } = layoutOf(chart.rel, surfaceOf({ capo: 3, dual: true, topPad: 120 }))
      const max = Math.max(0, doc - surface.viewport)
      for (const u of [0, 0.02, 0.15, 0.5, 0.9, 1]) {
        const s = scrollAtPlayhead(t, u, surface.viewport)
        if (u === 0) {
          expect(s, chart.rel).toBe(0)
          expect(playheadAtScroll(t, 0, surface.viewport), chart.rel).toBeCloseTo(0, 3)
          continue
        }
        if (u === 1) {
          expect(s, chart.rel).toBeCloseTo(max, 0)
          continue
        }
        // A chart shorter than its song hits the end of the paper before u=1;
        // the inverse of that clamp is "the end", not the fraction we asked.
        if (s >= max - 0.5) continue
        expect(playheadAtScroll(t, s, surface.viewport), `${chart.rel} u=${u}`).toBeCloseTo(u, 2)
      }
    }
  })
})
