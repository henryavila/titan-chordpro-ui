/**
 * Horizontal song-change gesture for a rehearsal list.
 *
 * Ownership is the pixel of pointerdown. The centre of the chart never
 * becomes a swipe. Left/right rails own song change; Safari's back edge
 * stays dead. Commit is release past a threshold — no velocity.
 */

/** Ignore a touch that starts on the viewport's left edge (Safari back). */
export const SWIPE_EDGE_PX = 24
/**
 * Exclusive rail width per viewer breakpoint. Same cuts as ChordproViewer `bp`:
 * xs <400, sm <640, md <900, lg <1280, xl. Phone (xs/sm) keeps the 64px that
 * worked on the handset; tablet+ (md/lg/xl) keeps the 128px that worked there.
 */
export const SWIPE_RAIL_PX = {
  xs: 64,
  sm: 64,
  md: 128,
  lg: 128,
  xl: 128,
} as const

export type SwipeBp = keyof typeof SWIPE_RAIL_PX

export function swipeBp(width: number): SwipeBp {
  const w = Number.isFinite(width) && width > 0 ? width : 390
  return w < 400 ? 'xs' : w < 640 ? 'sm' : w < 900 ? 'md' : w < 1280 ? 'lg' : 'xl'
}

export function swipeRailPx(width: number): number {
  return SWIPE_RAIL_PX[swipeBp(width)]
}
/** Below this, the gesture is still a tap (zen), not a peek. */
export const SWIPE_TAP_PX = 10
/** Veil fade after an immediate song swap. */
export const SWIPE_FADE_MS = 180
/** Stamp card height used to park the whole card above the finger. */
export const SWIPE_STAMP_H = 120
/** Gap between the finger and the bottom of the stamp. */
export const SWIPE_HAND_CLEAR_PX = 96
/** Keep the stamp below the title chrome. */
export const SWIPE_STAMP_PAD_TOP = 80
/** Keep the stamp above the dock. */
export const SWIPE_STAMP_PAD_BOTTOM = 24

/**
 * CSS `top` for the stamp so the card sits above the hand.
 * Mid-screen and low touches lift; a high touch clamps under the title.
 */
export function swipeStampTop(fingerY: number, height: number): number {
  const h = Number.isFinite(height) && height > 0 ? height : 844
  const y = Number.isFinite(fingerY) ? fingerY : h / 2
  const minTop = SWIPE_STAMP_PAD_TOP
  const maxTop = Math.max(minTop, h - SWIPE_STAMP_H - SWIPE_STAMP_PAD_BOTTOM)
  const preferred = y - SWIPE_HAND_CLEAR_PX - SWIPE_STAMP_H
  if (preferred >= minTop) return Math.min(preferred, maxTop)
  return minTop
}

export type SwipeAxis = 'undecided' | 'vertical' | 'horizontal' | 'ignored'
export type SwipeIntent = 'none' | 'next' | 'prev'
export type SwipePointerKind = 'touch' | 'pen' | 'mouse' | 'other'
export type SwipeZone = 'dead' | 'prev-rail' | 'next-rail' | 'center'

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
  /** CSS top (px) for the stamp, above the finger. */
  stampTop: number
}

export type SongSwipeBegin = {
  canPrev: boolean
  canNext: boolean
  width: number
  height: number
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
  stampTop: SWIPE_STAMP_PAD_TOP,
}

export function swipeThreshold(width: number): number {
  const w = Number.isFinite(width) && width > 0 ? width : 390
  return Math.max(72, Math.min(120, w * 0.28))
}

export function pointerKindOf(type: string | undefined): SwipePointerKind {
  if (type === 'touch' || type === 'pen' || type === 'mouse') return type
  return 'other'
}

export function swipeZone(x: number, width: number): SwipeZone {
  const w = Number.isFinite(width) && width > 0 ? width : 390
  const rail = swipeRailPx(w)
  if (x < SWIPE_EDGE_PX) return 'dead'
  if (x < SWIPE_EDGE_PX + rail) return 'prev-rail'
  if (x >= w - rail) return 'next-rail'
  return 'center'
}

/**
 * Event target is already a control — do not start a rail session.
 * Includes generic `button` because the dock's Rolar/Mais are buttons.
 */
export const SWIPE_CHROME_SEL =
  "button,input,textarea,select,a,[role='dialog'],[role='button'],.cpv-chrome,[data-end-offer],.cpv-scrim,.cpv-phone-stack,.cpv-hit,[data-scroll],[data-more]"

/**
 * Paint stack under an iOS rail hit. Must not include generic `button`:
 * reading chords are buttons (diagrams) and sit under the rail.
 */
export const SWIPE_DOCK_SEL =
  ".cpv-phone-stack,.cpv-chrome,.cpv-hit,[data-scroll],[data-more],[data-end-offer],.cpv-scrim,[role='dialog']"

function closestSel(node: EventTarget | null, sel: string): boolean {
  return !!(node instanceof Element && node.closest(sel))
}

export function elementsAtPoint(x: number, y: number): Element[] {
  if (typeof document === 'undefined') return []
  if (typeof document.elementsFromPoint === 'function') {
    return document.elementsFromPoint(x, y)
  }
  const one = document.elementFromPoint?.(x, y)
  return one ? [one] : []
}

export function swipeIgnoresPointer(
  target: EventTarget | null,
  clientX: number,
  clientY: number,
  hitTest: (x: number, y: number) => Element[] = elementsAtPoint,
): boolean {
  if (closestSel(target, SWIPE_CHROME_SEL)) return true
  return hitTest(clientX, clientY).some((el) => closestSel(el, SWIPE_DOCK_SEL))
}

export function beginSongSwipe(opts: SongSwipeBegin): SongSwipeSession {
  const threshold = swipeThreshold(opts.width)
  const x0 = opts.x
  const y0 = opts.y
  const height = Number.isFinite(opts.height) && opts.height > 0 ? opts.height : 844
  const zone = swipeZone(opts.x, opts.width)
  const touch = opts.pointerKind === 'touch' || opts.pointerKind === 'pen'
  const railIntent: SwipeIntent =
    zone === 'prev-rail' ? 'prev' : zone === 'next-rail' ? 'next' : 'none'
  let axis: SwipeAxis =
    touch && (zone === 'prev-rail' || zone === 'next-rail') ? 'horizontal' : 'ignored'
  let dx = 0
  let dy = 0
  let done = false

  function snap(): SongSwipeView {
    const stampTop = swipeStampTop(y0 + dy, height)
    if (axis === 'ignored' || axis === 'vertical' || axis === 'undecided') {
      return { ...IDLE, axis, dx, dy, stampTop }
    }
    const along =
      railIntent === 'next' ? -dx : railIntent === 'prev' ? dx : 0
    const going = along > 0
    const intent: SwipeIntent = going ? railIntent : 'none'
    const allowed =
      intent === 'next' ? opts.canNext : intent === 'prev' ? opts.canPrev : false
    const raw = going ? along / threshold : 0
    const progress = allowed ? Math.min(1, raw) : Math.min(0.45, raw * 0.4)
    const peeking = going && along > SWIPE_TAP_PX
    return {
      axis,
      dx,
      dy,
      progress,
      intent: peeking ? intent : 'none',
      armed: allowed && raw >= 1,
      peeking,
      stampTop,
    }
  }

  return {
    move(x: number, y: number) {
      if (done || axis === 'ignored') return snap()
      dx = x - x0
      dy = y - y0
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
