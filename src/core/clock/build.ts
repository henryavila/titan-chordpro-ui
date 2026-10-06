import { ANCHOR_RATIO } from './anchor'
import type { Timeline, TimelineBlock, TimelineOpts, TimelineSeg } from './types'

/**
 * Auto-scroll in musical time.
 *
 * A px/s speed taken from the BPM has no relation to the real duration, and
 * a compact intro (many chords, no lyric) would leave the screen before it is
 * played if the page followed those few pixels. Instead a reading playhead
 * walks the chart in the time of the music: every block gets a musical weight
 * and its pixel height is crossed in the time of that weight. The page stays
 * still through a voiceless lead, then the ramp starts at the first sung line
 * (or at the reading line when that intro is taller than a third of the screen).
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
 * One sung row is worth about eight beats when nothing else is written — two
 * bars of 4/4, and the same musical length in any other meter.
 *
 * Counted in bars instead, the estimate moved with the meter for no musical
 * reason: a 6/8 bar is half a 4/4 bar, so a sung line came out half as long,
 * and a 3/4 line three quarters. A phrase takes the time it takes; how the
 * chart bars it up is a different question.
 */
export const BEATS_PER_ROW = 8

/** Paper that is not music — folded into the next (or last) musical block. */
const SILENT_KIND = new Set(['comment', 'note', 'image'])

function isPlayedLead(b: TimelineBlock): boolean {
  if (b.kind === 'tab' || b.kind === 'score') return true
  if (b.kind !== 'stanza' && b.kind !== 'chorus') return false
  if (b.music.rows > 0) return false
  return b.music.beats > 0 || b.music.chords > 0 || b.music.bars > 0
}

/**
 * Where the ramp should start, in document y.
 *
 * A compact intro (played, not sung) must not consume the ramp: the first
 * lyric stays on screen until it is time to sing it. A tall intro (tab, a
 * screen of chords) still has to move once the playhead crosses the reading
 * line — otherwise the musician loses the notes they are playing.
 */
function scrollHoldPx(blocks: TimelineBlock[], content: number, viewport: number): number {
  let i = 0
  let played = false
  while (i < blocks.length) {
    const b = blocks[i]
    if (!b) break
    if (SILENT_KIND.has(b.kind)) {
      i++
      continue
    }
    if (isPlayedLead(b)) {
      played = true
      i++
      continue
    }
    break
  }
  const sung = blocks[i]
  if (!played || sung == null) return content
  const rest = Math.round(ANCHOR_RATIO * Math.max(0, viewport))
  return Math.min(sung.top, Math.max(content, rest))
}

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
    if (b.seconds != null && b.seconds > 0) fx = b.seconds
    else if (b.kind === 'score') fx = Math.max(2, b.music.bars || 2) * secBar
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
  //
  // Do not skip the stretch. 009's first verse at raw BPM (14 s) sends the
  // lyric off the top before the musician has sung it; `{duration: 02:40}` is
  // the run, and the four sung lines take their share of that. A leftover
  // parked on the last screen was the wrong extra — it stole time from verse 1.
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

  const content = segs[0]?.top ?? 0
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
    hold: scrollHoldPx(blocks, content, opts.viewport),
  }
}
