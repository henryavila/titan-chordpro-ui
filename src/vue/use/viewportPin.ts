/**
 * Whether pinning the viewer to the viewport would actually cover host chrome.
 *
 * Same document, no iframe: `position:fixed; inset:0` on the root covers the
 * host page. That is a real screen to win when the chart lives in a box on a
 * ficha. On a standalone page that already fills the visual viewport, pinning
 * moves nothing — the 20px "fullscreen" that used to light up a button and
 * change padding.
 *
 * The button is offered only when the uncovered edge is at least PIN_GAIN_PX.
 * Smaller gaps are safe-area / rounding, not a host chrome to take.
 */

/** Smallest host-chrome band that earns the fullscreen control. */
export const PIN_GAIN_PX = 48

function viewRect(): { left: number; top: number; right: number; bottom: number } {
  const vv = typeof window === 'undefined' ? null : window.visualViewport
  const left = vv?.offsetLeft ?? 0
  const top = vv?.offsetTop ?? 0
  const width = vv?.width ?? (typeof window === 'undefined' ? 0 : window.innerWidth)
  const height = vv?.height ?? (typeof window === 'undefined' ? 0 : window.innerHeight)
  return { left, top, right: left + width, bottom: top + height }
}

/** Largest edge of the visual viewport the element does not already cover, in px. */
export function uncoveredViewportPx(el: HTMLElement | null): number {
  if (typeof window === 'undefined' || !el) return 0
  const r = el.getBoundingClientRect()
  const v = viewRect()
  // How much of the *viewport* the element does not cover. Overflow past the
  // fold is not a gap — the viewport is still painted.
  return Math.max(
    Math.max(0, r.top - v.top),
    Math.max(0, r.left - v.left),
    Math.max(0, v.right - r.right),
    Math.max(0, v.bottom - r.bottom),
  )
}

/** True when pinning the element would cover a host chrome, not a sliver. */
export function pinWouldFillViewport(el: HTMLElement | null): boolean {
  return uncoveredViewportPx(el) >= PIN_GAIN_PX
}
