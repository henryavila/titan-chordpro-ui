import { describe, expect, it } from 'vitest'
import {
  decodeStrumPat,
  encodeStrumPat,
  formatXStrum,
  parseXStrum,
  patternFromCc,
  slotFromCcCode,
} from '../../src/core/strum'

describe('CC stroke codes → essence', () => {
  it('maps the everyday hits and the ghost pass', () => {
    expect(slotFromCcCode(7, 0)).toEqual({ dir: 'down', contact: 'hit', essence: 'normal' })
    expect(slotFromCcCode(19, 1)).toEqual({ dir: 'up', contact: 'hit', essence: 'normal' })
    expect(slotFromCcCode(23, 0)).toEqual({ dir: 'down', contact: 'ghost', essence: null })
    expect(slotFromCcCode(23, 1)).toEqual({ dir: 'up', contact: 'ghost', essence: null })
    expect(slotFromCcCode(24, 0)).toEqual({ dir: null, contact: 'rest', essence: null })
  })

  it('collapses technique codes into the four essences', () => {
    expect(slotFromCcCode(1, 0).essence).toBe('accent')
    expect(slotFromCcCode(9, 0).essence).toBe('mute')
    expect(slotFromCcCode(0, 0).essence).toBe('muted')
    expect(slotFromCcCode(8, 0).essence).toBe('accent') // palm+accent → accent
    expect(slotFromCcCode(3, 0).essence).toBe('normal') // agudas → normal
    expect(slotFromCcCode(22, 0)).toEqual({ dir: null, contact: 'hit', essence: 'muted' })
  })
})

describe('x_strum round-trip', () => {
  it('encodes Tu És pattern and reads it back', () => {
    const p = patternFromCc(
      [7, 23, 23, 19, 23, 19, 7, 23, 23, 19, 23, 19, 7, 23, 7, 19],
      ['1', 'x', 'x', 'x', '2', 'x', 'x', 'x', '3', 'x', 'x', 'x', '4', 'x', 'x', 'x'],
      71,
      'Padrão - Sugestão',
    )
    expect(p.meter).toBe('4/4')
    expect(p.grid).toBe(16)
    const raw = formatXStrum(p)
    expect(raw).toContain('bpm=71')
    expect(raw).toContain('meter=4/4')
    const again = parseXStrum(raw)
    expect(again?.slots).toEqual(p.slots)
    expect(again?.bpm).toBe(71)
  })

  it('keeps accent / mute / muted marks in the compact pat', () => {
    const slots = [
      slotFromCcCode(7, 0),
      slotFromCcCode(1, 1),
      slotFromCcCode(9, 2),
      slotFromCcCode(0, 3),
    ]
    const pat = encodeStrumPat(slots)
    expect(pat).toBe('DD!DmDa')
    expect(decodeStrumPat(pat)).toEqual(slots)
  })
})
