import { describe, expect, it } from 'vitest'
import {
  applyStrumPreset,
  draftStrumPreset,
  emptyPattern,
  formatXStrum,
  listStrumPresets,
  parseXStrum,
  type StrumPreset,
} from '../../src/core'

const ALLOWED_PAT = /^[DU!madu\s]+$/

const SAMPLE: StrumPreset[] = [
  {
    id: 'host-a',
    label: 'Host A',
    pattern: {
      bpm: null,
      meter: '4/4',
      grid: 8,
      label: 'Host A',
      slots: parseXStrum('bpm=71; meter=4/4; grid=8; label=Host A; pat=DuDu DuDU')!.slots,
    },
  },
  {
    id: 'host-b',
    label: 'Host B',
    pattern: {
      bpm: null,
      meter: '4/4',
      grid: 8,
      label: 'Host B',
      slots: parseXStrum('bpm=71; meter=4/4; grid=8; label=Host B; pat=Dudu Dudu')!.slots,
    },
  },
  {
    id: 'host-c',
    label: 'Host C',
    pattern: {
      bpm: null,
      meter: '4/4',
      grid: 16,
      label: 'Host C',
      slots: parseXStrum(
        'bpm=71; meter=4/4; grid=16; label=Host C; pat=DuDu DuDu DuDu DuDu',
      )!.slots,
    },
  },
]

describe('listStrumPresets', () => {
  it('defaults to an empty catalog (host owns presets)', () => {
    expect(listStrumPresets()).toEqual([])
  })

  it('clones a host catalog with stable ids', () => {
    const presets = listStrumPresets(SAMPLE)
    expect(presets.length).toBe(3)
    const ids = presets.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(presets[0]!.pattern.slots).not.toBe(SAMPLE[0]!.pattern.slots)
    expect(listStrumPresets(SAMPLE).map((p) => p.id)).toEqual(ids)
  })

  it('patterns round-trip via formatXStrum/parseXStrum without rest tokens', () => {
    for (const p of listStrumPresets(SAMPLE)) {
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
  it('replaces slots/grid/label from the host catalog and keeps bpm/meter', () => {
    const current = emptyPattern({ bpm: 92, meter: '4/4', grid: 8, label: 'Rascunho' })
    const preset = SAMPLE[0]!
    const next = applyStrumPreset(current, preset.id, SAMPLE)
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

  it('returns null for unknown preset id or empty catalog', () => {
    const current = emptyPattern({ bpm: 80, grid: 16 })
    expect(applyStrumPreset(current, 'no-such-preset', SAMPLE)).toBeNull()
    expect(applyStrumPreset(current, 'host-a')).toBeNull()
  })
})

describe('draftStrumPreset', () => {
  it('builds a save payload without id for the host to assign', () => {
    const pattern = emptyPattern({ bpm: 90, meter: '4/4', grid: 16, label: 'Rascunho' })
    const payload = draftStrumPreset(pattern, 'Meu groove')
    expect(payload.id).toBeUndefined()
    expect(payload.label).toBe('Meu groove')
    expect(payload.pattern.label).toBe('Meu groove')
    expect(payload.pattern.slots).toEqual(pattern.slots)
    expect(payload.pattern.slots).not.toBe(pattern.slots)
  })
})
