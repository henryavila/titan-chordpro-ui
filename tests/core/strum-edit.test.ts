import { describe, expect, it } from 'vitest'
import {
  beatsInMeter,
  densityFromGrid,
  emptyPattern,
  emptySlot,
  formatXStrum,
  gridFromDensity,
  hasStrumAnchor,
  inferSixEightPulse,
  isCompleteStrumPattern,
  isEmptySlot,
  isLegalStrumPattern,
  listSlotChoices,
  parseXStrum,
  repairStrumPattern,
  requiredDir,
  resizePattern,
  setSlot,
  setSlotCascading,
  slotEquals,
  type StrumPattern,
  type StrumSlot,
} from '../../src/core'

describe('density / meter grid', () => {
  it('maps 2|4 markers per beat to total grid by meter', () => {
    expect(beatsInMeter('4/4')).toBe(4)
    expect(beatsInMeter('2/4')).toBe(2)
    expect(beatsInMeter('3/4')).toBe(3)
    expect(gridFromDensity('4/4', 2)).toBe(8)
    expect(gridFromDensity('4/4', 4)).toBe(16)
    expect(gridFromDensity('2/4', 2)).toBe(4)
    expect(gridFromDensity('2/4', 4)).toBe(8)
    expect(gridFromDensity('3/4', 2)).toBe(6)
    expect(gridFromDensity('3/4', 4)).toBe(12)
  })

  it('6/8 needs pulse interpretation: 2 compound or 6 eighths', () => {
    expect(beatsInMeter('6/8', 2)).toBe(2)
    expect(beatsInMeter('6/8', 6)).toBe(6)
    expect(gridFromDensity('6/8', 2, 2)).toBe(4)
    expect(gridFromDensity('6/8', 4, 2)).toBe(8)
    expect(gridFromDensity('6/8', 2, 6)).toBe(12)
    expect(gridFromDensity('6/8', 4, 6)).toBe(24)
    expect(inferSixEightPulse('6/8', 8)).toBe(2)
    expect(inferSixEightPulse('6/8', 12)).toBe(6)
    expect(densityFromGrid('4/4', 16)).toBe(4)
    expect(densityFromGrid('2/4', 4)).toBe(2)
  })
})

describe('empty slots + anchor', () => {
  it('emptyPattern starts all empty (no direction) until anchor', () => {
    const p = emptyPattern({ bpm: 75, meter: '6/8', grid: 12, label: 'Padrão' })
    expect(p.slots).toHaveLength(12)
    expect(p.slots.every(isEmptySlot)).toBe(true)
    expect(hasStrumAnchor(p)).toBe(false)
    expect(isCompleteStrumPattern(p)).toBe(false)
  })

  it('emptySlot is undirected ghost, not rest', () => {
    expect(emptySlot()).toEqual({ dir: null, contact: 'ghost', essence: null })
    expect(isEmptySlot(emptySlot())).toBe(true)
    expect(isEmptySlot({ dir: 'down', contact: 'ghost', essence: null })).toBe(false)
    expect(isEmptySlot({ dir: null, contact: 'rest', essence: null })).toBe(true)
  })
})

describe('listSlotChoices (hand physics)', () => {
  it('without pattern: full catalog 8 hit + 2 ghost, zero rest', () => {
    const choices = listSlotChoices()
    expect(choices).toHaveLength(10)
    expect(choices.filter((c) => c.contact === 'hit')).toHaveLength(8)
    expect(choices.filter((c) => c.contact === 'ghost')).toHaveLength(2)
    expect(choices.some((c) => c.contact === 'rest')).toBe(false)
  })

  it('unanchored pattern: both directions available', () => {
    const p = emptyPattern({ meter: '4/4', grid: 8 })
    const choices = listSlotChoices(p, 0)
    expect(choices).toHaveLength(10)
    expect(choices.some((c) => c.dir === 'down')).toBe(true)
    expect(choices.some((c) => c.dir === 'up')).toBe(true)
  })

  it('anchored: only the required direction for that index', () => {
    const base = emptyPattern({ meter: '4/4', grid: 8 })
    const p = setSlotCascading(base, 0, { dir: 'down', contact: 'hit', essence: 'normal' })
    expect(requiredDir(p, 0)).toBe('down')
    expect(requiredDir(p, 1)).toBe('up')
    const at0 = listSlotChoices(p, 0)
    const at1 = listSlotChoices(p, 1)
    expect(at0).toHaveLength(5)
    expect(at1).toHaveLength(5)
    expect(at0.every((c) => c.dir === 'down')).toBe(true)
    expect(at1.every((c) => c.dir === 'up')).toBe(true)
    expect(at0.filter((c) => c.contact === 'hit')).toHaveLength(4)
    expect(at0.filter((c) => c.contact === 'ghost')).toHaveLength(1)
  })
})

describe('setSlotCascading + legality', () => {
  it('setting the anchor fills the rest with alternating dirs (loop closes)', () => {
    const base = emptyPattern({ meter: '4/4', grid: 8 })
    const next = setSlotCascading(base, 0, { dir: 'down', contact: 'hit', essence: 'accent' })
    expect(next).not.toBe(base)
    expect(base.slots.every(isEmptySlot)).toBe(true)
    expect(next.slots[0]).toEqual({ dir: 'down', contact: 'hit', essence: 'accent' })
    expect(next.slots.slice(1).every((s) => s.contact === 'ghost')).toBe(true)
    expect(next.slots.map((s) => s.dir)).toEqual([
      'down',
      'up',
      'down',
      'up',
      'down',
      'up',
      'down',
      'up',
    ])
    expect(isLegalStrumPattern(next)).toBe(true)
    expect(isCompleteStrumPattern(next)).toBe(true)
  })

  it('anchor in the middle still alternates and closes the loop', () => {
    const base = emptyPattern({ meter: '4/4', grid: 8 })
    const next = setSlotCascading(base, 3, { dir: 'up', contact: 'hit', essence: 'normal' })
    expect(next.slots[3]?.dir).toBe('up')
    expect(next.slots[2]?.dir).toBe('down')
    expect(next.slots[4]?.dir).toBe('down')
    expect(next.slots[0]?.dir).toBe('down')
    expect(next.slots[7]?.dir).toBe('up')
    expect(isLegalStrumPattern(next)).toBe(true)
  })

  it('changing phase recalculates all directions and preserves contact/essence', () => {
    const base = emptyPattern({ meter: '4/4', grid: 4 })
    let p = setSlotCascading(base, 0, { dir: 'down', contact: 'hit', essence: 'normal' })
    p = setSlotCascading(p, 1, { dir: 'up', contact: 'hit', essence: 'mute' })
    expect(p.slots[1]?.essence).toBe('mute')
    // Flip phase from slot 0 to up → cascade
    p = setSlotCascading(p, 0, { dir: 'up', contact: 'hit', essence: 'accent' })
    expect(p.slots.map((s) => s.dir)).toEqual(['up', 'down', 'up', 'down'])
    expect(p.slots[0]?.essence).toBe('accent')
    expect(p.slots[1]?.contact).toBe('hit')
    expect(p.slots[1]?.essence).toBe('mute')
    expect(isLegalStrumPattern(p)).toBe(true)
  })

  it('import path: repair adequates dirs; odd grids still rejected as illegal', () => {
    const evenIllegal: StrumPattern = {
      bpm: 90,
      meter: '4/4',
      grid: 4,
      label: 'CC',
      slots: [
        { dir: 'down', contact: 'hit', essence: 'normal' },
        { dir: 'down', contact: 'hit', essence: 'accent' },
        { dir: 'down', contact: 'ghost', essence: null },
        { dir: 'down', contact: 'hit', essence: 'normal' },
      ],
    }
    const fixed = repairStrumPattern(evenIllegal)
    expect(isLegalStrumPattern(fixed)).toBe(true)
    expect(fixed.slots[1]?.essence).toBe('accent')
    expect(fixed.slots.map((s) => s.dir)).toEqual(['down', 'up', 'down', 'up'])

    const odd: StrumPattern = {
      bpm: null,
      meter: '3/4',
      grid: 3,
      label: 'Odd',
      slots: [
        { dir: 'down', contact: 'hit', essence: 'normal' },
        { dir: 'down', contact: 'hit', essence: 'normal' },
        { dir: 'down', contact: 'hit', essence: 'normal' },
      ],
    }
    expect(isLegalStrumPattern(repairStrumPattern(odd))).toBe(false)
  })

  it('rejects same-direction neighbors and odd grids that cannot close the loop', () => {
    const illegal: StrumPattern = {
      bpm: 90,
      meter: '4/4',
      grid: 4,
      label: 'Bad',
      slots: [
        { dir: 'down', contact: 'hit', essence: 'normal' },
        { dir: 'down', contact: 'hit', essence: 'normal' },
        { dir: 'up', contact: 'ghost', essence: null },
        { dir: 'up', contact: 'ghost', essence: null },
      ],
    }
    expect(isLegalStrumPattern(illegal)).toBe(false)

    const odd: StrumPattern = {
      bpm: null,
      meter: '3/4',
      grid: 3,
      label: 'Odd',
      slots: [
        { dir: 'down', contact: 'hit', essence: 'normal' },
        { dir: 'up', contact: 'ghost', essence: null },
        { dir: 'down', contact: 'ghost', essence: null },
      ],
    }
    // last=down and first=down → loop broken
    expect(isLegalStrumPattern(odd)).toBe(false)
  })

  it('repairStrumPattern converts rest and forces alternating phase from first directed', () => {
    const raw = parseXStrum('bpm=80; meter=4/4; grid=4; label=Old; pat=D-U-')
    expect(raw).not.toBeNull()
    const fixed = repairStrumPattern(raw!)
    expect(fixed.slots.every((s) => s.contact !== 'rest')).toBe(true)
    expect(isLegalStrumPattern(fixed)).toBe(true)
    expect(fixed.slots.every((s) => s.dir != null)).toBe(true)
  })
})

describe('setSlot / resizePattern / emptyPattern (baseline)', () => {
  it('setSlot is immutable and round-trips via format/parse when complete', () => {
    const base = emptyPattern({ bpm: 75, meter: '6/8', grid: 12, label: 'Padrão' })
    const next = setSlotCascading(base, 0, { dir: 'down', contact: 'hit', essence: 'normal' })
    expect(next).not.toBe(base)
    expect(base.slots[0] && isEmptySlot(base.slots[0])).toBe(true)
    expect(next.slots[0]).toEqual({ dir: 'down', contact: 'hit', essence: 'normal' })
    const again = parseXStrum(formatXStrum(next))
    expect(again?.slots[0]).toEqual(next.slots[0])
    expect(again?.bpm).toBe(75)
  })

  it('resizePattern grows with empty slots and shrinks without mutating', () => {
    const base = emptyPattern({ bpm: 71, meter: '4/4', grid: 8, label: 'Padrão' })
    const grown = resizePattern(base, 16)
    expect(grown).not.toBe(base)
    expect(grown.grid).toBe(16)
    expect(grown.slots).toHaveLength(16)
    expect(grown.slots.slice(8).every(isEmptySlot)).toBe(true)
    expect(base.slots).toHaveLength(8)

    const anchored = setSlotCascading(base, 0, { dir: 'down', contact: 'hit', essence: 'normal' })
    const grownAnchored = resizePattern(anchored, 16)
    expect(grownAnchored.slots).toHaveLength(16)
    expect(isLegalStrumPattern(grownAnchored)).toBe(true)
    expect(grownAnchored.slots[8]?.dir).toBe('down')
    expect(grownAnchored.slots[9]?.dir).toBe('up')

    const shrunk = resizePattern(grown, 4)
    expect(shrunk.grid).toBe(4)
    expect(shrunk.slots).toHaveLength(4)
  })

  it('emptyPattern copies chart tempo bpm and never writes rest tokens', () => {
    const p = emptyPattern({ bpm: 75, meter: '6/8', grid: 12, label: 'Padrão' })
    expect(p.bpm).toBe(75)
    expect(p.meter).toBe('6/8')
    expect(p.grid).toBe(12)
    expect(p.label).toBe('Padrão')
    expect(p.slots.every(isEmptySlot)).toBe(true)
  })

  it('identity rewrite without slot edits preserves canonical x_strum string', () => {
    // Alternating dirs only — DdUu is illegal (down+down ghost).
    const raw = 'bpm=75; meter=6/8; grid=12; label=Padrão; pat=DuDu DuDu DuDu'
    const parsed = parseXStrum(raw)
    expect(parsed).not.toBeNull()
    expect(isLegalStrumPattern(parsed!)).toBe(true)
    const rewritten = formatXStrum(parsed as StrumPattern)
    expect(rewritten).toBe(raw)
  })

  it('setSlot (low-level) does not cascade', () => {
    const base = emptyPattern({ meter: '4/4', grid: 4 })
    const next = setSlot(base, 0, { dir: 'down', contact: 'hit', essence: 'normal' })
    expect(next.slots[0]?.dir).toBe('down')
    expect(isEmptySlot(next.slots[1]!)).toBe(true)
  })
})

describe('slotEquals', () => {
  it('compares contact, dir and essence for picker current-state', () => {
    const a: StrumSlot = { dir: 'down', contact: 'hit', essence: 'accent' }
    const b: StrumSlot = { dir: 'down', contact: 'hit', essence: 'accent' }
    const c: StrumSlot = { dir: 'up', contact: 'hit', essence: 'accent' }
    expect(slotEquals(a, b)).toBe(true)
    expect(slotEquals(a, c)).toBe(false)
    expect(
      slotEquals(
        { dir: 'down', contact: 'ghost', essence: null },
        { dir: 'down', contact: 'ghost', essence: null },
      ),
    ).toBe(true)
    expect(
      slotEquals(
        { dir: null, contact: 'rest', essence: null },
        { dir: 'down', contact: 'ghost', essence: null },
      ),
    ).toBe(false)
  })
})
