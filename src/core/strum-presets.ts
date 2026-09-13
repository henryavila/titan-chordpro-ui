/**
 * Built-in strum presets for the Batida sheet (B1).
 * Patterns use only the frozen x_strum token alphabet — no rest `-`.
 */

import { decodeStrumPat, type StrumPattern } from './strum'

export type StrumPreset = {
  id: string
  label: string
  pattern: StrumPattern
}

function fromPat(pat: string, label: string, meter = '4/4'): StrumPattern {
  const slots = decodeStrumPat(pat)
  return {
    bpm: null,
    meter,
    grid: slots.length,
    label,
    slots,
  }
}

/** Stable catalog — ids must not rename once shipped. */
const PRESETS: StrumPreset[] = [
  {
    id: 'basic-down-up',
    label: 'Baixo-cima',
    pattern: fromPat('DuDu DuDu DuDu DuDu', 'Baixo-cima'),
  },
  {
    id: 'folk-passa',
    label: 'Folk passa',
    pattern: fromPat('DdUu DdUu DdUu DdUu', 'Folk passa'),
  },
  {
    id: 'pop-accent',
    label: 'Pop acento',
    pattern: fromPat('DuDu DuD!u DuDu DuD!u', 'Pop acento'),
  },
  {
    id: 'mute-pulse',
    label: 'Mute',
    pattern: fromPat('DmUm DmUm DmUm DmUm', 'Mute'),
  },
]

export function listStrumPresets(): StrumPreset[] {
  return PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    pattern: {
      ...p.pattern,
      slots: p.pattern.slots.map((s) => ({ ...s })),
    },
  }))
}

/** Apply preset slots/grid/label; keep current bpm and meter. */
export function applyStrumPreset(
  current: StrumPattern,
  presetId: string,
): StrumPattern | null {
  const preset = PRESETS.find((p) => p.id === presetId)
  if (!preset) return null
  const p = preset.pattern
  return {
    bpm: current.bpm,
    meter: current.meter,
    grid: p.grid,
    label: p.label,
    slots: p.slots.map((s) => ({ ...s })),
  }
}
