import { ref } from 'vue'

/**
 * The one way to fill an iPhone screen from inside an iframe: ask the page that
 * owns the frame.
 *
 * An iframe never paints outside its own box. `position:fixed` is bounded by
 * it, and on iPhone Safari the Fullscreen API does not exist for elements — so
 * in an embed there, nothing the viewer does by itself can reach the screen.
 * What can is the host: it owns the `<iframe>`, and putting *that* at
 * `position:fixed; inset:0` gives the chart the whole viewport.
 *
 * So the viewer asks, and never assumes. The button that offers a full screen
 * appears only after a host has said it knows how to give one — a viewer that
 * offered it on the mere fact of being framed would be back to the bug this
 * came from: a control that lights up and moves nothing.
 *
 * The viewer never touches the host's DOM. Reaching through
 * `window.frameElement` would work on a same-origin embed and is exactly what
 * docs/EMBED-SDA.md forbids: the frame's inside is ours, its outside is the
 * host's, and that line is the whole embed contract.
 */

/** What the viewer sends. */
export type FrameRequest =
  | { source: 'titan-chordpro'; type: 'hello'; version: 1 }
  | { source: 'titan-chordpro'; type: 'expand'; version: 1; on: boolean }

/** What a host may send back. */
export type HostMessage =
  | { source: 'titan-chordpro-host'; type: 'capabilities'; expandFrame?: boolean }
  | { source: 'titan-chordpro-host'; type: 'expanded'; on: boolean }

export type FrameHostOpts = {
  /**
   * The host expanded or collapsed the frame. Collapsing may be its own doing —
   * a back gesture, a close button of its own — and immersive mode has to
   * follow, the same way it follows the browser leaving fullscreen.
   */
  onExpanded?: (on: boolean) => void
}

function framed(): boolean {
  try {
    return typeof window !== 'undefined' && window.parent !== window
  } catch {
    // Reading `parent` across a hostile boundary can throw; not framed is the
    // safe answer, and it only costs a button that would not have worked.
    return false
  }
}

export function useFrameHost(opts: FrameHostOpts = {}) {
  /** True only once a host has declared it can do this. Never inferred. */
  const canExpand = ref(false)
  /** True while the host reports the frame expanded. */
  const expanded = ref(false)

  /**
   * The parent's origin, learned from its first message rather than guessed:
   * a framed document cannot read it, and `'*'` on every later post would
   * broadcast to whatever page happens to hold the frame.
   */
  let hostOrigin = '*'

  function post(msg: FrameRequest) {
    if (!framed()) return
    try {
      window.parent.postMessage(msg, hostOrigin)
    } catch {
      /* the host went away */
    }
  }

  function onMessage(e: MessageEvent) {
    // Only the page that owns this frame gets to say any of this. Everything
    // inside is data written by another document — read the two booleans it is
    // allowed to set and nothing else.
    if (e.source !== window.parent) return
    const msg = e.data as HostMessage | null
    if (!msg || typeof msg !== 'object' || msg.source !== 'titan-chordpro-host') return
    if (e.origin && e.origin !== 'null') hostOrigin = e.origin
    if (msg.type === 'capabilities') {
      canExpand.value = msg.expandFrame === true
      return
    }
    if (msg.type === 'expanded') {
      const on = msg.on === true
      if (on === expanded.value) return
      expanded.value = on
      opts.onExpanded?.(on)
    }
  }

  /** Ask for the frame to fill the viewport, or to go back to its place. */
  function expand(on: boolean) {
    if (!canExpand.value) return
    post({ source: 'titan-chordpro', type: 'expand', version: 1, on })
  }

  function start() {
    if (!framed()) return
    window.addEventListener('message', onMessage)
    // A host that loaded first answers this; one that loads later announces
    // itself unprompted. Both orders end up in the same place.
    post({ source: 'titan-chordpro', type: 'hello', version: 1 })
  }

  function dispose() {
    if (typeof window === 'undefined') return
    window.removeEventListener('message', onMessage)
  }

  return { canExpand, expanded, expand, start, dispose }
}
