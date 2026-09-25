import { ref, type Ref } from 'vue'
import {
  beginSongSwipe,
  idleSwipeView,
  pointerKindOf,
  swipeIgnoresPointer,
  swipeZone,
  type SongSwipeSession,
  type SongSwipeView,
  type SwipeIntent,
} from './song-swipe'

export type SongSwipeHandlers = {
  view: Ref<SongSwipeView>
  onDown: (e: PointerEvent) => void
  attach: () => void
  detach: () => void
  /** Drop a stamp held across the fade. */
  clear: () => void
  /** True once after a peeking swipe, so the chart tap (zen) does not fire. */
  eatClick: () => boolean
}

/**
 * Pointer wiring for `beginSongSwipe`. A session only starts on a rail.
 * Capture + preventDefault happen on down, never after a 12px lock.
 */
export function useSongSwipe(opts: {
  enabled: () => boolean
  blocked: () => boolean
  canPrev: () => boolean
  canNext: () => boolean
  width: () => number
  onCommit: (intent: Exclude<SwipeIntent, 'none'>) => void
  onPeek?: (peeking: boolean) => void
}): SongSwipeHandlers {
  const view = ref<SongSwipeView>(idleSwipeView())
  let session: SongSwipeSession | null = null
  let pid: number | null = null
  let swallowClick = false
  let captured: Element | null = null
  let armedBuzz = false
  let originX = 0

  function reset() {
    session = null
    pid = null
    captured = null
    armedBuzz = false
    originX = 0
    view.value = idleSwipeView()
  }

  function clear() {
    view.value = idleSwipeView()
    opts.onPeek?.(false)
  }

  function buzzArmed() {
    if (armedBuzz) return
    armedBuzz = true
    try {
      navigator.vibrate?.(12)
    } catch {
      /* no haptic */
    }
  }

  function localPoint(e: PointerEvent): { x: number; width: number; origin: number } {
    const el = e.currentTarget instanceof Element ? e.currentTarget : captured
    const box = el && 'getBoundingClientRect' in el ? el.getBoundingClientRect() : null
    const width = box && box.width > 0 ? box.width : opts.width()
    const origin = box && box.width > 0 ? box.left : 0
    return { x: e.clientX - origin, width, origin }
  }

  function onDown(e: PointerEvent) {
    if (!opts.enabled() || opts.blocked()) return
    if (e.isPrimary === false) return
    if (typeof e.button === 'number' && e.button !== 0) return
    if (swipeIgnoresPointer(e.target, e.clientX, e.clientY)) return
    const kind = pointerKindOf(e.pointerType)
    const { x, width, origin } = localPoint(e)
    const zone = swipeZone(x, width)
    if (kind !== 'touch' && kind !== 'pen') return
    if (zone !== 'prev-rail' && zone !== 'next-rail') return
    session = beginSongSwipe({
      canPrev: opts.canPrev(),
      canNext: opts.canNext(),
      width,
      x,
      y: e.clientY,
      pointerKind: kind,
    })
    pid = e.pointerId
    originX = origin
    captured = e.currentTarget instanceof Element ? e.currentTarget : (e.target as Element | null)
    view.value = session.view()
    if (captured && 'setPointerCapture' in captured) {
      try {
        ;(captured as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        /* jsdom / already captured */
      }
    }
    if (e.cancelable) e.preventDefault()
  }

  function onMove(e: PointerEvent) {
    if (!session || e.pointerId !== pid) return
    const next = session.move(e.clientX - originX, e.clientY)
    view.value = next
    opts.onPeek?.(next.peeking)
    if (next.armed) buzzArmed()
    if (e.cancelable) e.preventDefault()
  }

  function onUp(e: PointerEvent) {
    if (!session || e.pointerId !== pid) return
    const { commit, view: last } = session.release()
    swallowClick = last.peeking || last.axis === 'horizontal'
    session = null
    pid = null
    captured = null
    armedBuzz = false
    if (commit === 'next' || commit === 'prev') {
      view.value = last
      opts.onPeek?.(false)
      opts.onCommit(commit)
    } else {
      view.value = idleSwipeView()
      opts.onPeek?.(false)
    }
  }

  function attach() {
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  function detach() {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    reset()
  }

  function eatClick() {
    if (!swallowClick) return false
    swallowClick = false
    return true
  }

  return { view, onDown, attach, detach, clear, eatClick }
}
