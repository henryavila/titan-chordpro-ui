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

export type EdgeInsets = { top: number; left: number; right: number; bottom: number }

type RectLike = { top: number; left: number; right: number; bottom: number }
type ViewLike = { offsetTop: number; offsetLeft: number; width: number; height: number }

/**
 * Absolute insets so an overlay covers only the visual viewport inside its
 * positioned parent. Soft keyboards shrink the visual viewport; without this,
 * `align-items:flex-end` docks a short sheet behind the keyboard.
 */
export function visualViewportInsets(parent: RectLike, view: ViewLike): EdgeInsets {
  const vBottom = view.offsetTop + view.height
  const vRight = view.offsetLeft + view.width
  return {
    top: Math.max(0, view.offsetTop - parent.top),
    left: Math.max(0, view.offsetLeft - parent.left),
    right: Math.max(0, parent.right - vRight),
    bottom: Math.max(0, parent.bottom - vBottom),
  }
}

/** Positioned ancestor the overlay is laid out against (viewer root, then CSS containing block). */
function overlayContainingBlock(el: HTMLElement): HTMLElement | null {
  const root = el.closest('.cpv-root, [data-cpv-root]')
  if (root instanceof HTMLElement) return root
  if (el.offsetParent instanceof HTMLElement) return el.offsetParent
  let p = el.parentElement
  while (p) {
    const pos = getComputedStyle(p).position
    if (pos && pos !== 'static') return p
    p = p.parentElement
  }
  return el.parentElement
}

/** Read insets for `el`'s containing block against the live visual viewport. */
export function overlayVisualInsets(el: HTMLElement | null): EdgeInsets {
  const zero = { top: 0, left: 0, right: 0, bottom: 0 }
  if (typeof window === 'undefined' || !el) return zero
  const parent = overlayContainingBlock(el)
  if (!parent) return zero
  const vv = window.visualViewport
  if (!vv) return zero
  return visualViewportInsets(parent.getBoundingClientRect(), {
    offsetTop: vv.offsetTop,
    offsetLeft: vv.offsetLeft,
    width: vv.width,
    height: vv.height,
  })
}
