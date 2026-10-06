import { anchorPx, pxAtScroll, scrollAtPx } from './anchor'
import type { Timeline } from './types'

/** Document y of the first musical pixel — chrome pad and legend sit above it. */
export function contentOrigin(t: Timeline | null): number {
  return t?.segs[0]?.top ?? 0
}

/** Pixel offset of a point in musical time. */
export function pxAtBars(t: Timeline | null, bars: number): number {
  if (!t) return 0
  if (bars <= 0) return contentOrigin(t)
  for (const s of t.segs) if (bars < s.at + s.bars) return s.top + ((bars - s.at) / s.bars) * s.h
  const last = t.segs[t.segs.length - 1]
  return last ? last.top + last.h : 0
}

/** Musical time at a pixel offset. */
export function barsAtPx(t: Timeline | null, px: number): number {
  if (!t) return 0
  if (px <= contentOrigin(t)) return 0
  for (const s of t.segs) if (px < s.top + s.h) return s.at + Math.max(0, (px - s.top) / s.h) * s.bars
  return t.bars
}

/**
 * Seconds the whole run takes at 1×.
 *
 * It is the timeline's own total, always — `buildTimeline` has already closed
 * that total on the declared duration when the chart states one. Returning the
 * duration here instead used to disagree with the total the segments add up
 * to, and the loop, which walks a fraction of `bars` in `runSec` seconds, then
 * played EVERY segment at the ratio between the two — counted bars included.
 * `durationSec` is only the answer before there is a timeline to measure.
 */
export function runSec(t: Timeline | null, durationSec: number | null): number {
  const sum = t ? t.bars : 0
  return sum > 0 ? sum : durationSec || 0
}

/** Remaining clock time: the fraction of music left × the run. */
export function etaSec(t: Timeline | null, durationSec: number | null, u: number, mul: number): number {
  const run = runSec(t, durationSec)
  if (run <= 0) return 0
  return Math.max(0, (1 - Math.min(1, u || 0)) * run / Math.max(0.01, mul))
}

/** `m:ss` for the remaining-time readout; `—` when there is nothing to show. */
export function formatEta(seconds: number): string {
  const s = Math.round(seconds)
  if (!s || !Number.isFinite(s)) return '—'
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Scroll offset the RAF writes at musical fraction `u` (0 at the first note). */
export function scrollAtPlayhead(t: Timeline | null, u: number, viewport: number): number {
  if (!t) return 0
  const origin = t.hold ?? contentOrigin(t)
  const anchor = anchorPx(viewport, t.doc)
  const max = Math.max(0, t.doc - viewport)
  const px = pxAtBars(t, Math.max(0, Math.min(1, u)) * t.bars)
  return Math.min(max, scrollAtPx(px, anchor, origin))
}

/** Musical fraction shown at a scroll offset — inverse of {@link scrollAtPlayhead}. */
export function playheadAtScroll(t: Timeline | null, scroll: number, viewport: number): number {
  if (!t) return 0
  if (scroll <= 0) return 0
  const origin = t.hold ?? contentOrigin(t)
  const anchor = anchorPx(viewport, t.doc)
  const bars = t.bars || 1
  return barsAtPx(t, pxAtScroll(scroll, anchor, origin)) / bars
}
