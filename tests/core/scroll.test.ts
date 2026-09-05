import { describe, expect, it } from 'vitest'
import { adjustScrollSpeed, calcScrollSpeed } from '../../src/core/scroll'

describe('calcScrollSpeed', () => {
  it('uses duration when available and contentHeight > 0', () => {
    expect(calcScrollSpeed(900, 30, null)).toBe(30)
    expect(calcScrollSpeed(600, 60, null)).toBe(10)
  })

  it('uses bpm fallback when no duration', () => {
    expect(calcScrollSpeed(900, null, 80)).toBe(20)
    expect(calcScrollSpeed(900, null, 120)).toBe(30)
  })

  it('uses default 30 when neither duration nor bpm', () => {
    expect(calcScrollSpeed(900, null, null)).toBe(30)
  })

  it('falls back to bpm when contentHeight is 0', () => {
    expect(calcScrollSpeed(0, 30, 80)).toBe(20)
  })

  it('uses default when contentHeight is 0 and no bpm', () => {
    expect(calcScrollSpeed(0, 30, null)).toBe(30)
  })
})

describe('adjustScrollSpeed', () => {
  it('increases by 15% when direction is up', () => {
    expect(adjustScrollSpeed(30, 'up')).toBe(34.5)
  })

  it('decreases by 15% when direction is down', () => {
    expect(adjustScrollSpeed(30, 'down')).toBe(26.1)
  })

  it('never returns below minimum of 5', () => {
    expect(adjustScrollSpeed(5, 'down')).toBe(5)
    expect(adjustScrollSpeed(1, 'down')).toBe(5)
  })

  it('returns a rounded value (1 decimal place)', () => {
    const result = adjustScrollSpeed(30, 'up')
    expect(result).toBe(Math.round(result * 10) / 10)
  })
})
