import { ref, type Ref } from 'vue'
import {
  beginSongSwipe,
  idleSwipeView,
  pointerKindOf,
  type SongSwipeSession,
  type SongSwipeView,
  type SwipeIntent,
} from './song-swipe'

export type SongSwipeHandlers = {
  view: Ref<SongSwipeView>
  onDown: (e: PointerEvent) => void
  attach: () => void
  detach: () => void
  /** Drop a stamp held across the slide-out. */
  clear: () => void
  /** True once after a peeking swipe, so the chart tap (zen) does not fire. */
  eatClick: () => boolean
}

/**
 * Pointer wiring for `beginSongSwipe`. Move/up live on `window` so the finger
 * can leave the chart; `preventDefault` only after the axis locks horizontal.
 */
export function useSongSwipe(opts: {
  enabled: () => boolean
  blocked: () => boolean
  canPrev: () => boolean
  canNext: () => boolean
  width: () => number
  onCommit: (intent: Exclude<SwipeIntent, 'none'>) => void
}): SongSwipeHandlers {
  const view = ref<SongSwipeView>(idleSwipeView())
  let session: SongSwipeSession | null = null
  let pid: number | null = null
  let swallowClick = false
  let captured: Element | null = null
  let armedBuzz = false

  function reset() {
    session = null
    pid = null
    captured = null
    armedBuzz = false
    view.value = idleSwipeView()
  }

  function clear() {
    view.value = idleSwipeView()
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

  function onDown(e: PointerEvent) {
    if (!opts.enabled() || opts.blocked()) return
    if (e.isPrimary === false) return
    if (typeof e.button === 'number' && e.button !== 0) return
    const t = e.target as HTMLElement | null
    if (
      t?.closest?.(
        "button,input,textarea,select,a,[role='dialog'],[role='button'],.cpv-chrome,[data-end-offer],.cpv-scrim",
      )
    ) {
      return
    }
    session = beginSongSwipe({
      canPrev: opts.canPrev(),
      canNext: opts.canNext(),
      width: opts.width(),
      x: e.clientX,
      y: e.clientY,
      pointerKind: pointerKindOf(e.pointerType),
    })
    pid = e.pointerId
    captured = e.currentTarget instanceof Element ? e.currentTarget : t
    view.value = session.view()
  }

  function onMove(e: PointerEvent) {
    if (!session || e.pointerId !== pid) return
    const next = session.move(e.clientX, e.clientY)
    view.value = next
    if (next.armed) buzzArmed()
    if (next.axis === 'horizontal') {
      if (captured && 'setPointerCapture' in captured) {
        try {
          ;(captured as HTMLElement).setPointerCapture(e.pointerId)
        } catch {
          /* jsdom / already captured */
        }
      }
      if (e.cancelable) e.preventDefault()
    }
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
      // Keep the stamp on screen while the chart slides out.
      view.value = last
      opts.onCommit(commit)
    } else {
      view.value = idleSwipeView()
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
