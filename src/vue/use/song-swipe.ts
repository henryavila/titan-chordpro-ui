/**
 * Horizontal song-change gesture for a rehearsal list.
 *
 * Vertical scroll is the default on the chart. A swipe only exists after the
 * first ~12px lock as clearly horizontal, and it only commits on release past
 * a threshold — the Tinder-style fade is the confirmation, not a second tap.
 */

export const SWIPE_LOCK_PX = 12
/** |dx| must beat this many times |dy| to count as horizontal. ~27°. */
export const SWIPE_RATIO = 2
/** Ignore a touch that starts on the viewport's left edge (Safari back). */
export const SWIPE_EDGE_PX = 24
/** Below this, the gesture is still a tap (zen), not a peek. */
export const SWIPE_TAP_PX = 10
/** Chart slides out, then the neighbour slides in. */
export const SWIPE_OUT_MS = 200
export const SWIPE_IN_MS = 260

export type SwipeAxis = 'undecided' | 'vertical' | 'horizontal' | 'ignored'
export type SwipeIntent = 'none' | 'next' | 'prev'
export type SwipePointerKind = 'touch' | 'pen' | 'mouse' | 'other'

export type SongSwipeView = {
  axis: SwipeAxis
  dx: number
  dy: number
  /** 0..1 towards the commit line. */
  progress: number
  intent: SwipeIntent
  /** Past the threshold and the neighbour exists — releasing now changes song. */
  armed: boolean
  /** Overlay should paint. */
  peeking: boolean
}

export type SongSwipeBegin = {
  canPrev: boolean
  canNext: boolean
  width: number
  x: number
  y: number
  pointerKind: SwipePointerKind
}

export type SongSwipeSession = {
  move(x: number, y: number): SongSwipeView
  release(): { commit: SwipeIntent; view: SongSwipeView }
  view(): SongSwipeView
}

const IDLE: SongSwipeView = {
  axis: 'undecided',
  dx: 0,
  dy: 0,
  progress: 0,
  intent: 'none',
  armed: false,
  peeking: false,
}

export function swipeThreshold(width: number): number {
  const w = Number.isFinite(width) && width > 0 ? width : 390
  return Math.max(72, Math.min(120, w * 0.28))
}

export function pointerKindOf(type: string | undefined): SwipePointerKind {
  if (type === 'touch' || type === 'pen' || type === 'mouse') return type
  return 'other'
}

export function beginSongSwipe(opts: SongSwipeBegin): SongSwipeSession {
  const threshold = swipeThreshold(opts.width)
  const x0 = opts.x
  const y0 = opts.y
  let axis: SwipeAxis =
    opts.pointerKind === 'touch' || opts.pointerKind === 'pen'
      ? opts.x < SWIPE_EDGE_PX
        ? 'ignored'
        : 'undecided'
      : 'ignored'
  let dx = 0
  let dy = 0
  let done = false

  function snap(): SongSwipeView {
    if (axis === 'ignored' || axis === 'vertical' || axis === 'undecided') {
      return { ...IDLE, axis, dx, dy }
    }
    const intent: SwipeIntent = dx < 0 ? 'next' : dx > 0 ? 'prev' : 'none'
    const allowed =
      intent === 'next' ? opts.canNext : intent === 'prev' ? opts.canPrev : false
    const raw = Math.abs(dx) / threshold
    // End of the list: the fade still appears, but it never arms.
    const progress = allowed ? Math.min(1, raw) : Math.min(0.45, raw * 0.4)
    const peeking = Math.abs(dx) > SWIPE_TAP_PX
    return {
      axis,
      dx,
      dy,
      progress,
      intent: peeking ? intent : 'none',
      armed: allowed && raw >= 1,
      peeking,
    }
  }

  return {
    move(x: number, y: number) {
      if (done || axis === 'ignored') return snap()
      dx = x - x0
      dy = y - y0
      if (axis === 'undecided') {
        const adx = Math.abs(dx)
        const ady = Math.abs(dy)
        if (Math.max(adx, ady) >= SWIPE_LOCK_PX) {
          axis = adx > SWIPE_RATIO * ady ? 'horizontal' : 'vertical'
        }
      }
      return snap()
    },
    release() {
      done = true
      const view = snap()
      const commit = view.armed ? view.intent : 'none'
      return { commit, view }
    },
    view: snap,
  }
}

export function idleSwipeView(): SongSwipeView {
  return { ...IDLE }
}
