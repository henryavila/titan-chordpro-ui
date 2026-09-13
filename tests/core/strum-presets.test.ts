import { describe, expect, it } from 'vitest'
import {
  applyStrumPreset,
  emptyPattern,
  formatXStrum,
  listStrumPresets,
  parseXStrum,
} from '../../src/core'

const ALLOWED_PAT = /^[DU!madu\s]+$/

describe('listStrumPresets', () => {
  it('returns at least three presets with stable ids', () => {
    const presets = listStrumPresets()
    expect(presets.length).toBeGreaterThanOrEqual(3)
    const ids = presets.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of presets) {
      expect(p.id).toMatch(/^[a-z][a-z0-9-]*$/)
      expect(p.label.trim().length).toBeGreaterThan(0)
      expect(p.pattern.slots.length).toBeGreaterThan(0)
      expect(p.pattern.grid).toBe(p.pattern.slots.length)
    }
    expect(listStrumPresets().map((p) => p.id)).toEqual(ids)
  })

  it('patterns round-trip via formatXStrum/parseXStrum without rest tokens', () => {
    for (const p of listStrumPresets()) {
      const raw = formatXStrum(p.pattern)
      const pat = raw.match(/pat=([^;]*)/)?.[1] ?? ''
      expect(pat).not.toContain('-')
      expect(pat).toMatch(ALLOWED_PAT)
      expect(p.pattern.slots.every((s) => s.contact !== 'rest')).toBe(true)
      const again = parseXStrum(raw)
      expect(again).not.toBeNull()
      expect(again!.slots).toEqual(p.pattern.slots)
      expect(again!.grid).toBe(p.pattern.grid)
      expect(again!.label).toBe(p.pattern.label)
      expect(formatXStrum(again!)).toBe(raw)
    }
  })
})

describe('applyStrumPreset', () => {
  it('replaces slots/grid/label and keeps bpm/meter from current', () => {
    const current = emptyPattern({ bpm: 92, meter: '4/4', grid: 8, label: 'Rascunho' })
    const preset = listStrumPresets()[0]!
    const next = applyStrumPreset(current, preset.id)
    expect(next).not.toBeNull()
    expect(next).not.toBe(current)
    expect(next!.bpm).toBe(92)
    expect(next!.meter).toBe('4/4')
    expect(next!.grid).toBe(preset.pattern.grid)
    expect(next!.label).toBe(preset.pattern.label)
    expect(next!.slots).toEqual(preset.pattern.slots)
    expect(next!.slots).not.toBe(preset.pattern.slots)
    const pat = formatXStrum(next!).match(/pat=([^;]*)/)?.[1] ?? ''
    expect(pat).not.toContain('-')
    expect(current.label).toBe('Rascunho')
    expect(current.slots).toHaveLength(8)
  })

  it('returns null for unknown preset id', () => {
    const current = emptyPattern({ bpm: 80, grid: 16 })
    expect(applyStrumPreset(current, 'no-such-preset')).toBeNull()
  })
})
