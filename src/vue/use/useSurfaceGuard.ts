import { ref, type Ref } from 'vue'

export type SurfaceGuardOpts = {
  /** The viewer root — `.cpv-root`, whose height the host is supposed to set. */
  root: Ref<HTMLElement | null>
  /** True while immersive: the root is `position:fixed`, so no parent governs. */
  immersive: Ref<boolean>
  /** Host opt-out. */
  enabled: Ref<boolean>
}

/** Below this the parent is not a frame — it collapsed to nothing. */
const FLOOR_PX = 40
/** First look, after fonts and VexFlow have had a chance to settle. */
const FIRST_MS = 500
/** A collapse has to survive a second look to count. */
const CONFIRM_MS = 1200

const WARNING =
  '[Titan Chordpro] Viewer sem altura resolvível: caiu no piso de min-height:460px dentro ' +
  'de uma página que rola. Dê ao ancestral imediato uma altura definida (ex.: ' +
  'height:calc(100dvh - 88px)) e não sobrescreva height/overflow/position do root nem do ' +
  'scroller. Numa ficha, o frame é 100dvh no fluxo (snap no topo). Ver docs/CONSUMER.md.'

/**
 * The viewer only works with a scroll region of its own: it is `height:100%`
 * over a `min-height` floor, and every bar is absolute against that box. A host
 * that embeds it without giving the parent a height gets the floor instead —
 * the chart grows past it, the page scrolls, and `bottom:0` quietly means "end
 * of the song", so the controls sit below the fold. That failed in silence and
 * read as a visual bug, which is why this says so out loud.
 */
export function useSurfaceGuard(opts: SurfaceGuardOpts) {
  const bad = ref(false)

  let dismissed = false
  let warned = false
  let sawBadOnce = false
  let firstT = 0
  let confirmT = 0

  /**
   * Drop the floor and ask the parent how tall it is, then put the floor back
   * in the same tick. With a height above, `height:100%` resolves against it and
   * the measurement stands; with `height:auto` above, nothing holds the root up
   * — its content is absolute — and it collapses. One reflow, immediately undone.
   */
  function probe(): number {
    const el = opts.root.value
    const parent = el?.parentElement
    if (!el || !parent) return -1
    // A broken embed still stands on the floor, so the root measures 460-odd.
    // A root of exactly zero means nobody laid this out — display:none, a tab
    // that never opened, or a DOM with no layout engine at all (jsdom). There
    // is nothing to accuse there, and accusing would be a false positive.
    if (el.clientHeight === 0) return -1
    const prev = el.style.minHeight
    el.style.minHeight = '0px'
    const h = parent.clientHeight
    el.style.minHeight = prev
    return h
  }

  function check() {
    if (!opts.enabled.value || dismissed) return
    // Immersive promotes the root to `position:fixed`: the parent stops being
    // the authority, so measuring it would report a collapse that isn't one.
    if (opts.immersive.value) {
      sawBadOnce = false
      if (bad.value) bad.value = false
      return
    }
    const h = probe()
    if (h < 0) return

    if (h >= FLOOR_PX) {
      sawBadOnce = false
      if (bad.value) bad.value = false
      return
    }
    // One reading is not enough: during first layout the frame shows collapsed
    // for an instant. Only a collapse that repeats is real.
    if (!sawBadOnce) {
      sawBadOnce = true
      window.clearTimeout(confirmT)
      confirmT = window.setTimeout(check, CONFIRM_MS)
      return
    }
    if (!warned) {
      warned = true
      console.warn(WARNING)
    }
    bad.value = true
  }

  function start() {
    window.clearTimeout(firstT)
    firstT = window.setTimeout(check, FIRST_MS)
  }

  /** The reader closed the banner: stop nagging for the rest of the session. */
  function dismiss() {
    dismissed = true
    bad.value = false
  }

  function dispose() {
    window.clearTimeout(firstT)
    window.clearTimeout(confirmT)
  }

  return { bad, start, check, dismiss, dispose }
}
