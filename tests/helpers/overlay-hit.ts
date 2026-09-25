/**
 * Overlays that may paint over the chart. They must never be the hit target
 * of a live dock/header control — that is the “part of the screen is stuck”
 * class of bug (swipe rails over Rolar/Mais, debug paint over the dock).
 */
export const OVERLAY_THIEF_SELECTORS = [
  '.cpv-swipe-rail',
  '.cpv-swipe-debug',
  '.cpv-glow',
  '.cpv-progress',
  '[data-song-swipe]',
] as const

export const OVERLAY_THIEF_SEL = OVERLAY_THIEF_SELECTORS.join(',')

/** Controls a musician must still be able to tap through any decorative overlay. */
export const LIVE_CONTROL_SELECTORS = [
  '[data-scroll]',
  '[data-more]',
  '[data-fit]',
  '[data-setlist-open]',
  '[data-song-prev]',
  '[data-song-next]',
  '[data-tone]',
  '[data-fs]',
  '[data-audio-open]',
  '[data-reading-switch]',
] as const

export type OverlaySample = { where: string; x: number; y: number }

export type OverlayThiefKind = string | null

export function samplePoints(r: {
  left: number
  top: number
  width: number
  height: number
  right?: number
  bottom?: number
}): OverlaySample[] {
  const right = r.right ?? r.left + r.width
  const bottom = r.bottom ?? r.top + r.height
  const insetX = Math.min(12, Math.max(1, r.width / 2))
  const insetY = Math.min(12, Math.max(1, r.height / 2))
  return [
    { where: 'center', x: r.left + r.width / 2, y: r.top + r.height / 2 },
    { where: 'left', x: r.left + insetX, y: r.top + r.height / 2 },
    { where: 'right', x: right - insetX, y: r.top + r.height / 2 },
    { where: 'top', x: r.left + r.width / 2, y: r.top + insetY },
    { where: 'bottom', x: r.left + r.width / 2, y: bottom - insetY },
  ]
}

export function overlayThiefOf(hit: Element | null, control: Element): OverlayThiefKind {
  if (!hit) return 'miss'
  if (hit === control || control.contains(hit) || hit.contains(control)) return null
  const thief = hit.closest(OVERLAY_THIEF_SEL)
  if (!thief) return null
  const rail = thief.getAttribute('data-swipe-rail')
  if (rail) return `rail:${rail}`
  if (thief.hasAttribute('data-song-swipe')) return 'swipe-veil'
  const cls = typeof thief.className === 'string' ? thief.className.trim().split(/\s+/)[0] : ''
  return cls || thief.tagName.toLowerCase()
}

export type OverlayHitFinding = {
  sel: string
  where: string
  x: number
  y: number
  pointerEvents: string
  top: string
  thief: OverlayThiefKind
}

export function describeHit(el: Element | null): string {
  if (!el) return 'null'
  const id = el.id ? `#${el.id}` : ''
  const raw = typeof el.className === 'string' ? el.className.trim() : ''
  const cls = raw ? '.' + raw.split(/\s+/).slice(0, 3).join('.') : ''
  const name = el.getAttribute('aria-label') || el.getAttribute('data-scroll') || el.getAttribute('data-more') || ''
  return `${el.tagName.toLowerCase()}${id}${cls}${name ? ` "${name}"` : ''}`
}
