export function calcScrollSpeed(
  contentHeight: number,
  durationSeconds: number | null,
  bpm: number | null,
): number {
  if (contentHeight > 0 && durationSeconds && durationSeconds > 0) {
    return contentHeight / durationSeconds
  }
  if (bpm && bpm > 0) {
    return bpm * 0.25
  }
  return 30
}

export function adjustScrollSpeed(current: number, direction: 'up' | 'down'): number {
  const factor = direction === 'up' ? 1.15 : 1 / 1.15
  return Math.max(5, Math.round(current * factor * 10) / 10)
}

/**
 * Human fine-tuning of the auto-scroll clock: ±12% per press, 0.3×–3×.
 * The base pace comes from the musical timeline, not from this factor.
 */
export function viewerMulStep(mul: number, direction: 'up' | 'down'): number {
  const next = direction === 'up' ? mul * 1.12 : mul / 1.12
  return Math.max(0.3, Math.min(3, +next.toFixed(3)))
}
