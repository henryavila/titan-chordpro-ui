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
 * The weight is built in two layers, and the difference between them is the
 * whole point:
 *
 *  1. What the chart STATES, read at the chart's BPM. `x///` written on a line
 *     that is played and not sung — an intro, an interlude, an ending — is a
 *     bar count, and it becomes the scroll time of that stretch directly. So
 *     is a bar drawn in a tab or a score, and so is the held tail at the end of
 *     a sung line. This layer is never calibrated: it is already the answer.
 *  2. What the chart LEAVES OUT. A sung row with no marks is a placeholder
 *     ({@link BEATS_PER_ROW} pulses) that is stretched or squeezed to close on
 *     a declared `{duration:}`. Unmarked chords are not duration: `[G] [A]
 *     [B] [C]` may be four bars or four beats, and the engine does not guess.
 *
 * A mark on a sung line belongs to layer 1 as a tail ADDED to that row, never
 * as the row's whole time — one `[Am]x///` at the end of a verse does not make
 * the verse four beats long.
 *
 * Rehearsal notes, section labels and loose images are paper, not music. Their
 * pixels ride with the next musical block (or the last one, when they trail)
 * so a "BEM SUAVE" at the top does not spend half a minute before the intro,
 * and the playhead does not jump over them either.
 *
 * This module is the framework-free half: pure math over measured blocks. The
 * binding owns the DOM measurements and the RAF loop.
 */

/**
 * Fraction of the viewport where the music comes to rest, once the scroll has
 * room to place it there. A third leaves two thirds of the screen for what is
 * coming, which is where a musician's eye already is — half the screen spent
 * on what has been played is half a screen not read.
 */
export const ANCHOR_RATIO = 0.34

/**
 * Share of the early scroll given over to building the anchor up.
 *
 * At the first note the music is necessarily at the top of the page: there is
 * nothing above it to scroll away. The old scroll paid that debt by standing
 * completely still until the music had covered a whole anchor of paper, which
 * on real charts was 25 to 96 seconds — a third of the song on `entrega-2`,
 * and half of `088-minha-ofertinha`, a chart with 29px of scrolling in it. The
 * page pays it gradually instead: it runs at `1 - ANCHOR_RAMP` of the music's
 * pace while the music drifts down to its resting place, and at the music's
 * pace from there. Nothing is ever frozen.
 */
export const ANCHOR_RAMP = 0.5

/**
 * One sung row is worth about eight beats when nothing else is written — two
 * bars of 4/4, and the same musical length in any other meter.
 *
 * Counted in bars instead, the estimate moved with the meter for no musical
 * reason: a 6/8 bar is half a 4/4 bar, so a sung line came out half as long,
 * and a 3/4 line three quarters. A phrase takes the time it takes; how the
 * chart bars it up is a different question.
 */
export const BEATS_PER_ROW = 8

/**
 * Beats written on the line in the `x///` convention — `x` is always the head
 * of the time (downbeat); `/` is a beat that is not the head. `[Cm]//` with no
 * `x` is two beats, including as a phrase tail. `[Dsus]x/ [D]//` is four beats,
 * one bar in 4/4. It is the only EXACT duration a chart offers, and it shows up
 * exactly where height lies: intro and interlude, many chords and few lyrics.
 * Returns 0 when the line carries no marks — the block falls back to estimate.
 * Product SoT: `docs/MARCAS-X.md`. Do not treat these marks as lyric.
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
 * True when the line is played, not sung: chords and `x///` marks, no lyric of
 * its own. Intros, interludes and endings are written this way, and they are
 * the one place a chart states its time exactly — the beats on such a line ARE
 * the scroll time of that stretch, at the chart's BPM.
 *
 * The same marks at the end of a SUNG line are a held tail, not the line's
 * whole duration, which is why the two cases have to be told apart.
 */
export function isPlayedLine(src: string): boolean {
  const bare = String(src ?? '').replace(/\[[^\]]*\]/g, '')
  return !/[^x/\s]/.test(bare)
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

/**
 * Progressive `MM:SS` mask for duration fields: digits only, colon before the
 * last two when there are 3+. `426` → `4:26`, `0426` → `04:26`.
 */
export function maskDurationMmSs(raw: string): string {
  const d = String(raw ?? '').replace(/\D/g, '').slice(0, 4)
  if (d.length <= 2) return d
  return `${d.slice(0, -2)}:${d.slice(-2)}`
}

/**
 * Finalize a masked duration on blur: `MM:SS`, seconds clamped to 0–59.
 * Incomplete values (fewer than 3 digits) stay as typed so the field can keep
 * showing "falta" until the musician finishes.
 */
export function normalizeDurationMmSs(raw: string): string {
  const d = String(raw ?? '').replace(/\D/g, '').slice(0, 4)
  if (d.length < 3) return maskDurationMmSs(raw)
  const mm = d.slice(0, -2).padStart(2, '0')
  const ss = Math.min(59, Number(d.slice(-2)))
  return `${mm}:${String(ss).padStart(2, '0')}`
}

/**
 * Hard gate: auto-scroll runs only when the chart declares a usable
 * `{duration:}`. Unmarked chords and a BPM are not a duration.
 */
export function hasSongDuration(duration: string | number | null | undefined): boolean {
  return songDurationSec(duration) != null
}

/** `{time:}` as a numerator and a denominator, 4/4 when absent or unusable. */
function meter(time: string | null | undefined): { n: number; d: number } {
  const m = String(time ?? '').match(/^\s*(\d+)\s*\/\s*(\d+)/)
  const n = m ? Number(m[1]) : 4
  const d = m ? Number(m[2]) : 4
  const ok = n >= 1 && n <= 12 && (d === 2 || d === 4 || d === 8 || d === 16)
  return ok ? { n, d } : { n: 4, d: 4 }
}

/**
 * A compound meter — 6/8, 9/8, 12/8 — is counted in the denominator's unit but
 * FELT in dotted groups of three, and that felt pulse is what a `{tempo:}`
 * names. 3/8 is left out: it is felt in three, like any simple meter.
 */
function compound(n: number, d: number): boolean {
  return d === 8 && n > 3 && n % 3 === 0
}

/**
 * Beats per bar, counted in the unit `{tempo:}` names — the felt pulse, not the
 * denominator. 4/4 is four, 3/4 is three, and 6/8 is TWO: a 6/8 bar is two
 * dotted quarters, not six of whatever a quarter is worth. Reading the
 * numerator alone made a 6/8 bar three times its real length, and every bar the
 * clock derives from it — tabs, scores, the sung estimate — went with it.
 */
export function beatsPerBar(time: string | null | undefined): number {
  const { n, d } = meter(time)
  return compound(n, d) ? n / 3 : n
}

/**
 * How many `x///` marks fit in one of those beats. A mark is one unit of the
 * denominator — a quarter in x/4, an eighth in x/8 — so a simple meter has one
 * mark per beat and a compound one has three.
 *
 * `[E]x//  [F#m7]x//  [D9]x//  [D9]x//` in 6/8 is how a musician writes half a
 * bar per chord, four chords, two bars. Read at one mark per beat it became
 * one and a half bars per chord: chords changing off the barline, which nobody
 * writes.
 */
export function marksPerBeat(time: string | null | undefined): number {
  const { n, d } = meter(time)
  return compound(n, d) ? 3 : 1
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
  /** Beats per bar, from `{time:}` — see {@link beatsPerBar}. */
  beatsPerBar: number
  /**
   * `x///` marks per beat, from `{time:}` — see {@link marksPerBeat}. Absent is
   * read as 1, the simple-meter answer, so a host built against the earlier
   * shape keeps the behaviour it had.
   */
  marksPerBeat?: number
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
  /**
   * Total seconds of music in the chart, and the length of the run: the segment
   * times add up to exactly this, and {@link runSec} returns it.
   */
  bars: number
  doc: number
  viewport: number
  /** Layer 1: seconds the chart states (`x///` played, tails, tabs, scores). */
  exact: number
  /** Layer 2: seconds estimated from sung rows, after calibration. */
  est: number
  /**
   * Calibration aimed at layer 2 before the speed ceiling and the closing pass
   * — a report of how far the chart's estimate sat from the declared duration,
   * not the factor the segments ended up carrying.
   */
  k: number
  /** True when the counted time already exceeds the declared duration. */
  over: boolean
  counted: boolean
}

/** Paper that is not music — folded into the next (or last) musical block. */
const SILENT_KIND = new Set(['comment', 'note', 'image'])

type RawSeg = { top: number; h: number; fx: number; es: number; kind: string }

function foldSilent(raw: RawSeg[]): RawSeg[] {
  const out: RawSeg[] = []
  let pending: RawSeg[] = []
  for (const s of raw) {
    if (SILENT_KIND.has(s.kind) && s.fx + s.es <= 0) {
      pending.push(s)
      continue
    }
    if (pending.length) {
      const first = pending[0]
      if (first) {
        s.h = Math.max(1, s.top + s.h - first.top)
        s.top = first.top
      }
      pending = []
    }
    out.push(s)
  }
  if (pending.length) {
    if (out.length) {
      const last = out[out.length - 1]
      const end = pending[pending.length - 1]
      if (last && end) last.h = Math.max(1, end.top + end.h - last.top)
    } else {
      out.push(...pending)
    }
  }
  return out
}

export function buildTimeline(blocks: TimelineBlock[], opts: TimelineOpts): Timeline {
  const bpb = Math.max(1, opts.beatsPerBar)
  // One beat is one pulse of the `{tempo:}`; one `x///` mark is one unit of the
  // meter's denominator, which in a compound meter is a third of that pulse.
  const secBeat = 60 / Math.max(30, opts.bpm)
  const secMark = secBeat / Math.max(1, opts.marksPerBeat || 1)
  const secBar = secBeat * bpb
  const barPx = Math.max(18, opts.barPx)

  // `fx` is layer 1 — time the chart states, never calibrated. `es` is layer 2
  // — time it leaves out. A block usually carries both: a verse whose last line
  // ends on `[Am]x///` is four beats of tail on top of its sung rows, and the
  // one thing it is NOT is four beats long.
  const counted: RawSeg[] = []
  let exact = 0
  let est = 0

  for (const b of blocks) {
    let fx = 0
    let es = 0
    if (b.kind === 'score') fx = Math.max(2, b.music.bars || 2) * secBar
    else if (b.kind === 'tab') fx = Math.max(2, b.music.bars) * secBar
    else {
      // Intro, interlude, ending: the bars written there are the scroll time.
      // `tail` joined `BlockMusic` after it shipped, so a host that builds one
      // by hand is read as a chart with no held tails rather than as NaN.
      fx = (b.music.beats + (b.music.tail || 0)) * secMark
      es = b.music.rows * BEATS_PER_ROW * secBeat
    }
    exact += fx
    est += es
    counted.push({ top: b.top, h: Math.max(1, b.h), fx, es, kind: b.kind })
  }

  // The gap between two blocks belongs to the block above it. Left out of every
  // segment, it is pixels the mapping does not own, and the playhead teleported
  // across one at every block boundary. The same is true of the trailing pad
  // under the last block: without it, barsAtPx saturates at t.bars as soon as
  // the reading line passes the last measured box, and a resume mid-page
  // looks like the end of the song.
  //
  // The leading offset is different: it is chrome (page pad, capo legend), not
  // music. Folding it into the first block spent a slice of the intro walking
  // empty paper — 4.8 s of an 8-beat intro on 120px of pad, and every compact
  // of the title strip changed the clock. It stays as `segs[0].top` (the
  // content origin). The RAF starts there at t=0 with scroll 0.
  if (counted[0]) {
    for (let i = 0; i < counted.length - 1; i++) {
      const s = counted[i]
      const nx = counted[i + 1]
      if (s && nx) s.h = Math.max(1, nx.top - s.top)
    }
    const last = counted[counted.length - 1]
    if (last) last.h = Math.max(last.h, Math.max(1, opts.doc - last.top))
  }

  // Labels and notes do not get their own clock. Their paper is attached to
  // the next musical block so the intro still lasts the bars it writes, and
  // "BEM SUAVE" is already on screen at t=0 instead of being a 25 s tax.
  const raw = foldSilent(counted)

  // Anything still without music (a chart of notes, a leftover empty stanza)
  // crosses at the page's average pace so the playhead does not jump.
  const musicalPx = raw.reduce((a, s) => a + (s.fx + s.es > 0 ? s.h : 0), 0) || 1
  const pxSec = exact + est > 0 ? musicalPx / (exact + est) : barPx / secBar
  for (const s of raw) {
    if (s.fx + s.es > 0) continue
    s.es = Math.max(0.2, s.h / Math.max(1, pxSec))
    est += s.es
  }

  // Calibration: layer 1 is left alone — it is what the chart says. Layer 2 is
  // stretched or squeezed so the whole closes on the target, which is the
  // declared duration when there is one. Without one the chart's own musical
  // time IS the target, so `k` is 1 and nothing is invented.
  const dur = opts.durationSec
  const music = exact + est
  const target = dur || music
  const over = !!(dur && exact > dur * 0.98)
  let k = 1
  if (!over && est > 0 && target > exact) k = Math.max(0.1, Math.min(10, (target - exact) / est))

  // Speed ceiling: an estimated stretch never goes faster than 2.2× the page's
  // average pace. A counted bar may be as slow as it likes, but nothing is
  // crossed at a run — tall scores included, which is where this used to hurt.
  const tot = raw.reduce((a, s) => a + s.fx + s.es * k, 0) || 1
  const totH = raw.reduce((a, s) => a + s.h, 0) || 1
  const vAvg = totH / tot
  const time = raw.map((s) => ({
    ...s,
    es: s.es > 0 ? Math.max(s.es * k, s.h / (vAvg * 2.2) - s.fx, 0) : 0,
  }))

  // `runSec` divides the clock by `bars`, so `bars` has to BE the run. Whatever
  // the ceiling above added comes back out of layer 2 — otherwise the total no
  // longer matches the duration and every counted bar plays at the ratio
  // between the two, which is how an exact intro ended up 1.9× slow.
  const estNow = time.reduce((a, s) => a + s.es, 0)
  if (!over && estNow > 0 && target > exact) {
    const f = (target - exact) / estNow
    for (const s of time) s.es *= f
  }

  const segs: TimelineSeg[] = []
  let bars = 0
  for (const s of time) {
    const b = Math.max(0.05, s.fx + s.es)
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
    est: Math.max(0, bars - exact),
    k,
    over,
    counted: exact > 0,
  }
}

/** Document y of the first musical pixel — chrome pad and legend sit above it. */
export function contentOrigin(t: Timeline | null): number {
  return t?.segs[0]?.top ?? 0
}

/** Pixel offset of a point in musical time. */
export function pxAtBars(t: Timeline | null, bars: number): number {
  if (!t) return 0
  if (bars <= 0) return contentOrigin(t)
  for (const s of t.segs) if (bars < s.at + s.bars) return s.top + ((bars - s.at) / s.bars) * s.h
  const last = t.segs[t.segs.length - 1]
  return last ? last.top + last.h : 0
}

/** Musical time at a pixel offset. */
export function barsAtPx(t: Timeline | null, px: number): number {
  if (!t) return 0
  if (px <= contentOrigin(t)) return 0
  for (const s of t.segs) if (px < s.top + s.h) return s.at + Math.max(0, (px - s.top) / s.h) * s.bars
  return t.bars
}

/**
 * Seconds the whole run takes at 1×.
 *
 * It is the timeline's own total, always — `buildTimeline` has already closed
 * that total on the declared duration when the chart states one. Returning the
 * duration here instead used to disagree with the total the segments add up
 * to, and the loop, which walks a fraction of `bars` in `runSec` seconds, then
 * played EVERY segment at the ratio between the two — counted bars included.
 * `durationSec` is only the answer before there is a timeline to measure.
 */
export function runSec(t: Timeline | null, durationSec: number | null): number {
  const sum = t ? t.bars : 0
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

/**
 * Where the music rests on screen, in px from the top of the viewport.
 *
 * Bounded by the scrolling the chart actually has to give: a chart barely
 * taller than the frame cannot hold the music a third of the way down, and
 * asking it to used to freeze the page for most of the song over a scroll of
 * a few dozen pixels.
 */
export function anchorPx(viewportHeight: number, docHeight = Infinity): number {
  const room = Math.max(0, docHeight - viewportHeight)
  return Math.round(ANCHOR_RATIO * Math.min(viewportHeight, room))
}

/**
 * Where the page sits when the music has reached `px` of the document.
 *
 * `origin` is the first musical pixel ({@link contentOrigin}). Chrome above it
 * must not consume the ramp: at t=0 the playhead is already at `origin` and
 * the page is at scroll 0. With `origin = 0` this is the original formula.
 */
export function scrollAtPx(px: number, anchor: number, origin = 0): number {
  const rel = Math.max(0, px - origin)
  const room = Math.max(0, anchor - origin)
  return rel - Math.min(room, rel * ANCHOR_RAMP)
}

/** The music shown at a given scroll offset — the inverse of {@link scrollAtPx}. */
export function pxAtScroll(scroll: number, anchor: number, origin = 0): number {
  const s = Math.max(0, scroll)
  const room = Math.max(0, anchor - origin)
  if (room <= 0) return origin + s
  // Below the knee the remaining anchor is still growing, so the page has
  // covered only `1 - ANCHOR_RAMP` of the music's paper past the origin.
  const knee = (room * (1 - ANCHOR_RAMP)) / ANCHOR_RAMP
  return s < knee ? origin + s / (1 - ANCHOR_RAMP) : s + origin + room
}

/** Scroll offset the RAF writes at musical fraction `u` (0 at the first note). */
export function scrollAtPlayhead(t: Timeline | null, u: number, viewport: number): number {
  if (!t) return 0
  const origin = contentOrigin(t)
  const anchor = anchorPx(viewport, t.doc)
  const max = Math.max(0, t.doc - viewport)
  const px = pxAtBars(t, Math.max(0, Math.min(1, u)) * t.bars)
  return Math.min(max, scrollAtPx(px, anchor, origin))
}

/** Musical fraction shown at a scroll offset — inverse of {@link scrollAtPlayhead}. */
export function playheadAtScroll(t: Timeline | null, scroll: number, viewport: number): number {
  if (!t) return 0
  const origin = contentOrigin(t)
  const anchor = anchorPx(viewport, t.doc)
  const bars = t.bars || 1
  return barsAtPx(t, pxAtScroll(scroll, anchor, origin)) / bars
}

/** Clock inputs a chart provides; `bpmOverride` is the reader's own tempo. */
export function clockOf(view: ChordProView, bpmOverride?: number | null) {
  return {
    bpm: bpmOverride || sheetBpm(view.meta.tempo) || 100,
    beatsPerBar: beatsPerBar(view.meta.time),
    marksPerBeat: marksPerBeat(view.meta.time),
    durationSec: songDurationSec(view.meta.duration),
  }
}
