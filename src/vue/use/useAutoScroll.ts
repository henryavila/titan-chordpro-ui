import { nextTick, ref, type Ref } from 'vue'
import {
  buildTimeline,
  clockOf,
  etaSec,
  formatEta,
  hasSongDuration,
  playheadAtScroll,
  runSec,
  scrollAtPlayhead,
  type ChartBlock,
  type Timeline,
  type TimelineBlock,
  type TitanChordproDocument,
} from '@henryavila/titan-chordpro-ui'

/**
 * Page clock for auto-scroll.
 *
 * Owns the animation-frame id and `swipePeekHold`. The step and the swipe
 * gesture have to share that one flag — a second copy lets the page walk
 * while a chart change is mid-gesture. The step math is the chart clock
 * (`clockOf` / `{duration:}`); this file does not estimate a verse.
 */
export type UseAutoScrollOpts = {
  scroller: Ref<HTMLElement | null>
  page: Ref<HTMLElement | null>
  parsed: () => TitanChordproDocument
  blocks: () => readonly ChartBlock[]
  /** Bar height from the reading scale. Not the score editor's beat count. */
  barPx: () => number
  /** Notation fold is measuring. The playhead must not adopt that scroll. */
  notationReflow: () => boolean
  autoHide: () => boolean
  /** Linked click: Rolar and the metronome are one control. */
  follow: () => boolean
  metRunning: () => boolean
  /** `met.stop` — a no-op when the click is already down, which ends the loop. */
  stopMet: () => void
  dismissEnd: () => void
  offerNext: () => void
  canScroll: () => boolean
  /**
   * Linked start: count-in, then the click calls `startScroll`.
   * Sound policy stays with the caller. This clock only rolls.
   */
  startLinked: () => void
}

/** Where the reader was, taken before anything is allowed to move. */
export type PageSpot = {
  padTop: number
  scroll: number
  max: number
  anchor: HTMLElement | null
  anchorFromEye: number
}

export function useAutoScroll(opts: UseAutoScrollOpts) {
  const scrolling = ref(false)
  /** Paper the chart has left to give, in px. Zero when it fits the frame. */
  const scrollRoom = ref(0)
  const mul = ref(1)
  const progress = ref(0)
  const etaLabel = ref('—')
  const idle = ref(false)

  const scroller = opts.scroller
  const page = opts.page

  let raf = 0
  let written = 0
  /** Fraction of the song already played by the reading playhead. */
  let playhead = 0
  let timeline: Timeline | null = null
  let etaTick = -1
  let idleT = 0
  let userScroll: (() => void) | null = null
  /** Swipe is between charts. The step holds the page until the gesture lets go. */
  let swipePeekHold = false

  function setSwipePeekHold(hold: boolean) {
    swipePeekHold = hold
  }

  function clearTimeline() {
    timeline = null
  }

  function stampWritten(top: number) {
    written = top
  }

  function readPlayhead() {
    return playhead
  }

  /** Host swapped the chart. The fraction is the saved place, or the top. */
  function parkPlayhead(u: number) {
    playhead = u
    timeline = null
    progress.value = u
    etaLabel.value = '—'
  }

  /** Transpose jumps back to the top of the song. Eta stays whatever it was. */
  function zeroPlayhead() {
    playhead = 0
    timeline = null
    progress.value = 0
  }

  function measureBlocks(): TimelineBlock[] {
    const el = scroller.value
    if (!el) return []
    // The sub-pixel carrier is a transform on the column, and every rect below
    // would come back shifted by it. Measure the paper, not where it is riding.
    const carrier = page.value?.style.transform ?? ''
    if (carrier && page.value) page.value.style.transform = ''
    const base = el.getBoundingClientRect().top - el.scrollTop
    const nodes = el.querySelectorAll('[data-block]')
    const list = opts.blocks()
    const out: TimelineBlock[] = []
    for (let i = 0; i < nodes.length; i++) {
      const b = list[i]
      if (!b) continue
      const r = (nodes[i] as HTMLElement).getBoundingClientRect()
      out.push({ top: r.top - base, h: Math.max(1, r.height), music: b.music, kind: b.kind })
    }
    if (carrier && page.value) page.value.style.transform = carrier
    return out
  }

  function rebuildTimeline(): Timeline | null {
    const el = scroller.value
    if (!el) {
      timeline = null
      return null
    }
    const clock = clockOf(opts.parsed())
    timeline = buildTimeline(measureBlocks(), {
      bpm: clock.bpm,
      beatsPerBar: clock.beatsPerBar,
      marksPerBeat: clock.marksPerBeat,
      durationSec: clock.durationSec,
      barPx: opts.barPx(),
      doc: el.scrollHeight,
      viewport: el.clientHeight,
    })
    return timeline
  }

  function timelineFor(): Timeline | null {
    const el = scroller.value
    if (!el) return null
    if (
      !timeline ||
      Math.abs(timeline.doc - el.scrollHeight) > 2 ||
      Math.abs(timeline.viewport - el.clientHeight) > 2
    ) {
      return rebuildTimeline()
    }
    return timeline
  }

  /**
   * The anchor is read from the live frame, not cached: the reader changes type
   * size and turns fit on mid-song, and both move how much paper there is.
   */
  /**
   * Measured, never derived: the chart's height moves with type size, fit, the
   * key it was transposed to and the width it wraps at, and only the DOM knows.
   */
  function syncScrollRoom() {
    const el = scroller.value
    scrollRoom.value = el ? Math.max(0, el.scrollHeight - el.clientHeight) : 0
  }

  /** Put a running scroll back on its musical position after a relayout. */
  function reseatScroll() {
    const el = scroller.value
    if (!el) return
    rebuildTimeline()
    const max = el.scrollHeight - el.clientHeight
    el.scrollTop = Math.max(0, Math.min(max, scrollAtPlayhead(timelineFor(), playhead, el.clientHeight)))
    written = el.scrollTop
  }

  /** The reserve the chart is standing on right now, before anything moves it. */
  function pageTopPad(): number {
    const pg = page.value
    return pg ? parseFloat(getComputedStyle(pg).paddingTop) || 0 : 0
  }

  function pageSpot(): PageSpot {
    const el = scroller.value
    const eye = el ? el.getBoundingClientRect().top + el.clientHeight * 0.4 : 0
    let anchor: HTMLElement | null = null
    let distance = Infinity
    for (const node of el?.querySelectorAll<HTMLElement>('.titan-chordpro-lyric') ?? []) {
      const d = Math.abs(node.getBoundingClientRect().top - eye)
      if (d < distance) {
        anchor = node
        distance = d
      }
    }
    return {
      padTop: pageTopPad(),
      scroll: el?.scrollTop ?? 0,
      max: el ? Math.max(0, el.scrollHeight - el.clientHeight) : 0,
      anchor,
      anchorFromEye: anchor ? anchor.getBoundingClientRect().top - eye : 0,
    }
  }

  /**
   * The reserved chrome band changes height without the frame changing size, so
   * no ResizeObserver fires and nothing puts the chart back under the reader's
   * eye. Mid-song the musical position is the truth — the playhead survives any
   * relayout; standing still, the pixel they were reading is.
   */
  function reflowPage(before: PageSpot) {
    void nextTick(() => {
      const el = scroller.value
      timeline = null
      if (!el) return
      syncScrollRoom()
      if (scrolling.value) {
        reseatScroll()
        return
      }
      const max = Math.max(0, el.scrollHeight - el.clientHeight)
      // The two ends are places, not offsets. Somebody parked at the top is at
      // the *start of the song*, and giving the reserve back must not shove them
      // into the first verse; the same holds for the last line.
      if (before.scroll <= 1) el.scrollTop = 0
      else if (before.scroll >= before.max - 1) el.scrollTop = max
      else if (before.anchor?.isConnected) {
        const eye = el.getBoundingClientRect().top + el.clientHeight * 0.4
        const target = eye + before.anchorFromEye
        el.scrollTop = Math.max(0, Math.min(max, el.scrollTop + before.anchor.getBoundingClientRect().top - target))
      } else {
        const shift = (pageTopPad() || before.padTop) - before.padTop
        el.scrollTop = Math.max(0, Math.min(max, before.scroll + shift))
      }
      written = el.scrollTop
    })
  }

  /**
   * The fraction of a pixel `scrollTop` will not carry.
   *
   * A scroll offset is snapped to whole pixels — measured, `scrollTop` reads back
   * as an integer on every frame, whatever we write. At the speeds a chart really
   * moves (5 px/s and under), that means eleven frames dead still and then a 1px
   * teleport, six times a second. A discrete jump is what a vestibular system
   * reads as motion, so the page looked calm and felt awful.
   *
   * So the whole pixels go to `scrollTop`, which keeps the scrollbar, the drag
   * and every measurement honest, and the remainder rides on a composited
   * transform, which is not snapped. Together they move continuously.
   */
  function setSubPixel(dy: number) {
    const el = page.value
    if (!el) return
    el.style.transform = dy > 0.001 ? `translate3d(0,${-dy}px,0)` : ''
  }

  function stopScroll() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    window.clearTimeout(idleT)
    if (scroller.value && userScroll) scroller.value.removeEventListener('scroll', userScroll)
    userScroll = null
    scrolling.value = false
    idle.value = false
    setSubPixel(0)
    // Every way out of the scroll passes through here — the end of the song, a
    // transpose, a song change — and with the two linked, none of them may leave
    // a click ticking over a chart that has stopped. `met.stop()` is a no-op when
    // the click is already down, which is what ends the call back into here.
    if (opts.follow()) opts.stopMet()
  }

  function startScroll() {
    const el = scroller.value
    if (!el) return
    if (!hasSongDuration(opts.parsed().meta.duration)) return
    // Hitting Rolar again is continuing the song, not confirming the end.
    opts.dismissEnd()
    scrolling.value = true
    window.clearTimeout(idleT)
    if (opts.autoHide()) idle.value = true
    rebuildTimeline()
    // From the top the playhead starts at 0 and the page stays put until it
    // reaches the reading line — the whole intro stays on screen. Resuming
    // mid-song, the playhead adopts the current reading line.
    const max0 = Math.max(0, el.scrollHeight - el.clientHeight)
    const mapped = playheadAtScroll(timelineFor(), el.scrollTop, el.clientHeight)
    const atPaperEnd = max0 <= 1 || el.scrollTop >= max0 - 2
    playhead = el.scrollTop <= 1 ? 0 : Math.min(atPaperEnd ? 1 : 0.999, Math.max(0, mapped))
    written = el.scrollTop
    etaTick = -1
    let prev = performance.now()

    // The musician may drag the chart while it rolls (back a bit, skip ahead).
    // The playhead adopts that position and carries on from there.
    userScroll = () => {
      if (!scrolling.value || opts.notationReflow()) return
      if (Math.abs(el.scrollTop - written) > 1.5) {
        const maxS = Math.max(0, el.scrollHeight - el.clientHeight)
        const atEnd = maxS <= 1 || el.scrollTop >= maxS - 2
        const u = playheadAtScroll(timelineFor(), el.scrollTop, el.clientHeight)
        playhead = Math.min(atEnd ? 1 : 0.999, Math.max(0, u))
      }
    }
    el.addEventListener('scroll', userScroll, { passive: true })

    const dur = clockOf(opts.parsed()).durationSec
    const step = (now: number) => {
      if (!scrolling.value) return
      if (swipePeekHold) {
        prev = now
        raf = requestAnimationFrame(step)
        return
      }
      // One timeline per frame: each call may re-measure every block in the DOM,
      // and asking four times over lands four full layouts in the same frame.
      const t = timelineFor()
      // Coming back from a background tab must not teleport the chart — but a
      // dropped frame is time the music really spent, so the interval is capped
      // rather than thrown away, which used to lose it for good.
      const dt = Math.min(Math.max((now - prev) / 1000, 0), 0.25)
      prev = now
      const run = runSec(t, dur)
      if (run > 0 && dt > 0) playhead = Math.min(1, playhead + (dt / run) * mul.value)
      const max = el.scrollHeight - el.clientHeight
      const target = Math.max(0, Math.min(max, scrollAtPlayhead(t, playhead, el.clientHeight)))
      // Floor, never round: rounding would put the page half a pixel ahead of
      // the transform and hand back the jump this is here to remove.
      const whole = Math.floor(target)
      el.scrollTop = whole
      setSubPixel(target - whole)
      written = el.scrollTop
      // One update per clock second, not per frame: re-rendering the whole sheet
      // 60 times a second ate the frames of the scroll itself.
      const sec = Math.round(etaSec(t, dur, playhead, mul.value))
      if (sec !== etaTick) {
        etaTick = sec
        progress.value = playhead
        etaLabel.value = formatEta(sec)
      }
      if (playhead >= 1) {
        // The clock can claim "done" while the paper still has room — resume
        // after a drag used to fire "Fim da música" in the middle of the chart.
        // The offer is the end of the paper, not the end of the fraction.
        if (max <= 1 || el.scrollTop >= max - 2) {
          progress.value = 1
          stopScroll()
          opts.offerNext()
          return
        }
        playhead = 0.999
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }

  /**
   * Linked (the default): Rolar is the same start as the click — count-in, then
   * the chart. Independent: the two stay two controls, and Rolar only rolls.
   * Stopping still goes through `stopScroll`, which silences a linked click.
   *
   * Audio: outside Ensaio Batida, linked Rolar always starts silent so practice
   * Fonte (Batida/Click) does not leak onto the stage. Inside Ensaio Batida,
   * Rolar inherits Batida sound. That choice is `startLinked`, not this clock.
   */
  function toggleScroll() {
    if (scrolling.value || (opts.follow() && opts.metRunning())) {
      stopScroll()
      return
    }
    if (!opts.canScroll()) return
    // Count-in delays startScroll; the leftover "Fim da música" must leave now.
    opts.dismissEnd()
    if (opts.follow()) opts.startLinked()
    else startScroll()
  }

  function wake() {
    if (idle.value) idle.value = false
    window.clearTimeout(idleT)
    if (scrolling.value && opts.autoHide()) idleT = window.setTimeout(() => (idle.value = true), 2600)
  }

  /** Roll just went live: hide the chrome without waiting out the idle timer. */
  function snapIdle() {
    window.clearTimeout(idleT)
    idle.value = true
  }

  function clearIdleTimer() {
    window.clearTimeout(idleT)
  }

  return {
    scrolling,
    scrollRoom,
    mul,
    progress,
    etaLabel,
    idle,
    setSubPixel,
    stopScroll,
    startScroll,
    toggleScroll,
    reseatScroll,
    reflowPage,
    pageSpot,
    syncScrollRoom,
    rebuildTimeline,
    clearTimeline,
    stampWritten,
    readPlayhead,
    parkPlayhead,
    zeroPlayhead,
    setSwipePeekHold,
    wake,
    snapIdle,
    clearIdleTimer,
  }
}
