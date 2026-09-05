import type { BlockMusic, ChordProView } from './types'

/**
 * Auto-scroll in musical time.
 *
 * A px/s speed taken from the BPM has no relation to the real duration, and
 * the page starts moving on the first frame — the intro leaves the screen
 * before it is played. Instead a reading playhead walks the chart in the time
 * of the music: every block gets a musical weight and its pixel height is
 * crossed in the time of that weight. The page only moves once the playhead
 * passes the reading line, so intro and ending stay still on screen.
 *
 * This module is the framework-free half: pure math over measured blocks. The
 * binding owns the DOM measurements and the RAF loop.
 */

/** Fraction of the viewport where the reading line sits. */
export const ANCHOR_RATIO = 0.5

/** One sung row is worth about two bars when nothing else is written. */
export const BARS_PER_ROW = 2

/**
 * Beats written on the line in the `x///` convention — `x` is beat one of the
 * bar and every `/` is a following beat. `[Dsus]x/ [D]//` is four beats, one
 * bar in 4/4. It is the only EXACT duration a chart offers, and it shows up
 * exactly where height lies: intro and interlude, many chords and few lyrics.
 * Returns 0 when the line carries no marks — the block falls back to estimate.
 */
export function lineBeats(src: string): number {
  const s = String(src ?? '')
  if (!/[x/]/.test(s)) return 0
  let n = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c !== 'x' && c !== '/') continue
    const prev = i > 0 ? (s[i - 1] as string) : ''
    const next = i + 1 < s.length ? (s[i + 1] as string) : ''
    const nextOk = next === '' || next === '/' || /\s/.test(next)
    if (!nextOk) continue
    if (c === 'x') {
      if (prev === ']' || (prev !== '' && /\s/.test(prev))) n++
    } else if (prev === ']' || prev === 'x' || prev === '/' || (prev !== '' && /\s/.test(prev))) n++
  }
  return n
}

/**
 * Song duration declared in the chart: accepts `m:ss`, `mm:ss`, `h:mm:ss` or
 * plain seconds, and tolerates a space after the directive colon.
 */
export function songDurationSec(duration: string | number | null | undefined): number | null {
  const s = String(duration ?? '').trim()
  if (!s) return null
  const m = s.match(/^(?:(\d+):)?(\d{1,3}):(\d{1,2})$/)
  let sec: number | null = null
  if (m) sec = Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3])
  else if (/^\d+$/.test(s)) sec = Number(s)
  return sec && sec >= 20 && sec <= 3 * 3600 ? sec : null
}

/** Beats per bar from `{time:}` (4 when absent or unusable). */
export function beatsPerBar(time: string | null | undefined): number {
  const m = String(time ?? '').match(/^\s*(\d+)\s*\/\s*(\d+)/)
  const n = m ? Number(m[1]) : 4
  return n >= 1 && n <= 12 ? n : 4
}

/** `{tempo:}` when it is a usable BPM. */
export function sheetBpm(tempo: string | number | null | undefined): number | null {
  const t = Number(tempo)
  return t >= 30 && t <= 300 ? Math.round(t) : null
}

export type TimelineBlock = {
  /** Offset of the block inside the scrolled document, in px. */
  top: number
  /** Measured height of the block, in px. */
  h: number
  music: BlockMusic
  kind: string
}

export type TimelineOpts = {
  /** BPM used for the clock (chart tempo, or the reader's own). */
  bpm: number
  /** Beats per bar, from `{time:}`. */
  beatsPerBar: number
  /** Declared song duration in seconds, when the chart states one. */
  durationSec: number | null
  /** Average pixel height of a bar — pace of last resort. */
  barPx: number
  /** Scrollable document height, for invalidation. */
  doc: number
  /** Viewport height, for invalidation. */
  viewport: number
}

export type TimelineSeg = {
  top: number
  h: number
  /** Seconds of music spent crossing this segment. */
  bars: number
  /** Seconds of music elapsed when the segment starts. */
  at: number
}

export type Timeline = {
  segs: TimelineSeg[]
  /** Total seconds of music in the chart. */
  bars: number
  doc: number
  viewport: number
  /** Seconds the chart counts exactly (`x///`, tabs, scores). */
  exact: number
  /** Seconds estimated, after calibration. */
  est: number
  /** Calibration factor applied to the estimated blocks. */
  k: number
  /** True when the counted time already exceeds the declared duration. */
  over: boolean
  counted: boolean
}

export function buildTimeline(blocks: TimelineBlock[], opts: TimelineOpts): Timeline {
  const bpb = Math.max(1, opts.beatsPerBar)
  const secBeat = 60 / Math.max(30, opts.bpm)
  const secBar = secBeat * bpb
  const barPx = Math.max(18, opts.barPx)

  const raw: Array<{ top: number; h: number; t: number; fixed: boolean }> = []
  let exact = 0
  let est = 0

  for (const b of blocks) {
    const h = Math.max(1, b.h)
    let t = 0
    let fixed = false
    if (b.music.beats > 0) {
      // Counted in the chart: real time, never touched again.
      t = b.music.beats * secBeat
      fixed = true
    } else if (b.kind === 'score') {
      t = Math.max(2, b.music.bars || 2) * secBar
      fixed = true
    } else if (b.kind === 'tab') {
      t = Math.max(2, b.music.bars) * secBar
      fixed = true
    } else if (b.music.rows > 0) {
      // No marks: one bar per chord on the line, the usual guess in these
      // charts. It overestimates, and the calibration below corrects it.
      t = Math.max(b.music.rows, b.music.chords) * secBar
    }
    if (t > 0 && fixed) exact += t
    else if (t > 0) est += t
    raw.push({ top: b.top, h, t, fixed })
  }

  // Blocks with no music of their own (label, note, loose score) cross at the
  // page's average pace, so they neither steal time from what is sung nor jump.
  const music = exact + est
  const musicalPx = raw.reduce((a, s) => a + (s.t > 0 ? s.h : 0), 0) || 1
  const pxSec = music > 0 ? musicalPx / music : barPx / secBar
  for (const s of raw) {
    if (s.t !== 0) continue
    s.t = Math.max(0.2, s.h / Math.max(1, pxSec))
    est += s.t
  }

  // Calibration: what the chart counts precisely is left alone; the rest is
  // stretched or squeezed so the whole closes on the target. The target is the
  // declared duration when there is one and, when there is not, the chart's own
  // musical time — otherwise the height of tall scores inflates the run.
  const dur = opts.durationSec
  const target = dur || music
  let k = 1
  if (target > 0 && est > 0) k = Math.max(0.25, Math.min(4, (target - exact) / est))
  const over = !!(dur && exact > dur * 0.98)
  if (over) k = 1

  // Speed ceiling: an estimated block never goes faster than 2.2× the page's
  // average pace. A counted bar may be as slow as it likes, but nothing is
  // crossed at a run — tall scores included, which is where this used to hurt.
  const tot = raw.reduce((a, s) => a + (s.fixed ? s.t : s.t * k), 0) || 1
  const totH = raw.reduce((a, s) => a + s.h, 0) || 1
  const vAvg = totH / tot

  const segs: TimelineSeg[] = []
  let bars = 0
  for (const s of raw) {
    let b = s.fixed ? s.t : s.t * k
    if (!s.fixed) b = Math.max(b, s.h / (vAvg * 2.2))
    b = Math.max(0.05, b)
    segs.push({ top: s.top, h: s.h, bars: b, at: bars })
    bars += b
  }
  if (!segs.length) {
    const b = Math.max(8, Math.max(1, opts.doc) / barPx)
    segs.push({ top: 0, h: Math.max(1, opts.doc), bars: b, at: 0 })
    bars = b
  }

  return {
    segs,
    bars,
    doc: opts.doc,
    viewport: opts.viewport,
    exact,
    est: est * k,
    k,
    over,
    counted: exact > 0,
  }
}

/** Pixel offset of a point in musical time. */
export function pxAtBars(t: Timeline | null, bars: number): number {
  if (!t) return 0
  if (bars <= 0) return 0
  for (const s of t.segs) if (bars < s.at + s.bars) return s.top + ((bars - s.at) / s.bars) * s.h
  const last = t.segs[t.segs.length - 1]
  return last ? last.top + last.h : 0
}

/** Musical time at a pixel offset. */
export function barsAtPx(t: Timeline | null, px: number): number {
  if (!t) return 0
  if (px <= 0) return 0
  for (const s of t.segs) if (px < s.top + s.h) return s.at + Math.max(0, (px - s.top) / s.h) * s.bars
  return t.bars
}

/**
 * Seconds the whole run takes at 1×: the declared duration when the chart has
 * one — that is what the scroll must spend on the clock — otherwise the time
 * the estimated bars take at the chart's BPM.
 */
export function runSec(t: Timeline | null, durationSec: number | null): number {
  const sum = t ? t.bars : 0
  if (durationSec && !(t && t.over)) return durationSec
  return sum > 0 ? sum : durationSec || 0
}

/** Remaining clock time: the fraction of music left × the run. */
export function etaSec(t: Timeline | null, durationSec: number | null, u: number, mul: number): number {
  const run = runSec(t, durationSec)
  if (run <= 0) return 0
  return Math.max(0, (1 - Math.min(1, u || 0)) * run / Math.max(0.01, mul))
}

/** `m:ss` for the remaining-time readout; `—` when there is nothing to show. */
export function formatEta(seconds: number): string {
  const s = Math.round(seconds)
  if (!s || !Number.isFinite(s)) return '—'
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Reading-line offset inside the scroller. */
export function anchorPx(viewportHeight: number): number {
  return Math.round(viewportHeight * ANCHOR_RATIO)
}

/** Clock inputs a chart provides; `bpmOverride` is the reader's own tempo. */
export function clockOf(view: ChordProView, bpmOverride?: number | null) {
  return {
    bpm: bpmOverride || sheetBpm(view.meta.tempo) || 100,
    beatsPerBar: beatsPerBar(view.meta.time),
    durationSec: songDurationSec(view.meta.duration),
  }
}
