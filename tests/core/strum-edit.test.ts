import { describe, expect, it } from 'vitest'
import {
  emptyPattern,
  formatXStrum,
  listSlotChoices,
  parseXStrum,
  resizePattern,
  setSlot,
  slotEquals,
  type StrumPattern,
  type StrumSlot,
} from '../../src/core'

describe('listSlotChoices', () => {
  it('returns 8 hit composites + 2 ghost and zero rest', () => {
    const choices = listSlotChoices()
    expect(choices).toHaveLength(10)
    expect(choices.filter((c) => c.contact === 'hit')).toHaveLength(8)
    expect(choices.filter((c) => c.contact === 'ghost')).toHaveLength(2)
    expect(choices.some((c) => c.contact === 'rest')).toBe(false)

    for (const dir of ['down', 'up'] as const) {
      for (const essence of ['normal', 'accent', 'mute', 'muted'] as const) {
        expect(
          choices.some((c) => c.contact === 'hit' && c.dir === dir && c.essence === essence),
        ).toBe(true)
      }
      expect(choices.some((c) => c.contact === 'ghost' && c.dir === dir && c.essence === null)).toBe(
        true,
      )
    }
  })
})

describe('slotEquals', () => {
  it('compares contact, dir and essence for picker current-state', () => {
    const a: StrumSlot = { dir: 'down', contact: 'hit', essence: 'accent' }
    const b: StrumSlot = { dir: 'down', contact: 'hit', essence: 'accent' }
    const c: StrumSlot = { dir: 'up', contact: 'hit', essence: 'accent' }
    expect(slotEquals(a, b)).toBe(true)
    expect(slotEquals(a, c)).toBe(false)
    expect(slotEquals({ dir: 'down', contact: 'ghost', essence: null }, { dir: 'down', contact: 'ghost', essence: null })).toBe(
      true,
    )
    expect(slotEquals({ dir: null, contact: 'rest', essence: null }, { dir: 'down', contact: 'ghost', essence: null })).toBe(
      false,
    )
  })
})

describe('setSlot / resizePattern / emptyPattern', () => {
  it('setSlot is immutable and round-trips via format/parse', () => {
    const base = emptyPattern({ bpm: 75, meter: '6/8', grid: 12, label: 'Padrão' })
    const next = setSlot(base, 0, { dir: 'down', contact: 'hit', essence: 'normal' })
    expect(next).not.toBe(base)
    expect(base.slots[0].contact).toBe('ghost')
    expect(next.slots[0]).toEqual({ dir: 'down', contact: 'hit', essence: 'normal' })
    const again = parseXStrum(formatXStrum(next))
    expect(again?.slots[0]).toEqual(next.slots[0])
    expect(again?.bpm).toBe(75)
  })

  it('resizePattern grows with ghost slots and shrinks without mutating', () => {
    const base = emptyPattern({ bpm: 71, meter: '4/4', grid: 8, label: 'Padrão' })
    const grown = resizePattern(base, 16)
    expect(grown).not.toBe(base)
    expect(grown.grid).toBe(16)
    expect(grown.slots).toHaveLength(16)
    expect(grown.slots.slice(8).every((s) => s.contact === 'ghost')).toBe(true)
    expect(base.slots).toHaveLength(8)

    const shrunk = resizePattern(grown, 4)
    expect(shrunk.grid).toBe(4)
    expect(shrunk.slots).toHaveLength(4)
    expect(parseXStrum(formatXStrum(shrunk))?.slots).toEqual(shrunk.slots)
  })

  it('emptyPattern slots are ghost not rest and copies chart tempo bpm', () => {
    const p = emptyPattern({ bpm: 75, meter: '6/8', grid: 12, label: 'Padrão' })
    expect(p.bpm).toBe(75)
    expect(p.meter).toBe('6/8')
    expect(p.grid).toBe(12)
    expect(p.label).toBe('Padrão')
    expect(p.slots).toHaveLength(12)
    expect(p.slots.every((s) => s.contact === 'ghost')).toBe(true)
    expect(p.slots.every((s) => s.essence === null)).toBe(true)
    expect(p.slots[0].dir).toBe('down')
    expect(p.slots[1].dir).toBe('up')
    expect(formatXStrum(p)).not.toContain('-')
  })

  it('identity rewrite without slot edits preserves canonical x_strum string', () => {
    const raw = 'bpm=75; meter=6/8; grid=12; label=Padrão; pat=DdUu DdUu DdUu'
    const parsed = parseXStrum(raw)
    expect(parsed).not.toBeNull()
    const rewritten = formatXStrum(parsed as StrumPattern)
    expect(rewritten).toBe(raw)
  })
})
