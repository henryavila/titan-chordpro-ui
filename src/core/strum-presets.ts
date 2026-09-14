/**
 * Strum presets — catalog owned by the host/consumer.
 * The package only formats/applies; it does not ship or persist presets.
 */

import { isLegalStrumPattern, type StrumPattern } from './strum'

export type StrumPreset = {
  id: string
  label: string
  pattern: StrumPattern
}

/** Payload the viewer emits when the musician saves the draft as a preset. */
export type SaveStrumPresetPayload = {
  /** Omit when creating — the host assigns a stable id on persist. */
  id?: string
  label: string
  pattern: StrumPattern
}

function clonePattern(p: StrumPattern): StrumPattern {
  return {
    ...p,
    slots: p.slots.map((s) => ({ ...s })),
  }
}

/** Immutable copy of a host-provided catalog (default empty). */
export function listStrumPresets(
  catalog: readonly StrumPreset[] = [],
): StrumPreset[] {
  return catalog.map((p) => ({
    id: p.id,
    label: p.label,
    pattern: clonePattern(p.pattern),
  }))
}

/**
 * Apply preset slots/grid/label from `catalog`; keep current bpm and meter.
 * Returns null when the id is missing from the catalog.
 */
export function applyStrumPreset(
  current: StrumPattern,
  presetId: string,
  catalog: readonly StrumPreset[] = [],
): StrumPattern | null {
  const preset = catalog.find((p) => p.id === presetId)
  if (!preset) return null
  const p = preset.pattern
  if (!isLegalStrumPattern(p)) return null
  return {
    bpm: current.bpm,
    meter: current.meter,
    grid: p.grid,
    label: p.label,
    slots: p.slots.map((s) => ({ ...s })),
  }
}

/** Build a save payload from the current draft (host owns id + storage). */
export function draftStrumPreset(
  pattern: StrumPattern,
  label?: string,
): SaveStrumPresetPayload {
  const trimmed = (label ?? pattern.label ?? '').trim() || 'Padrão'
  return {
    label: trimmed,
    pattern: clonePattern({ ...pattern, label: trimmed }),
  }
}
