import { describe, expect, it } from 'vitest'
import { metronomePulseHit } from '../../src/vue/use/useMetronome'

describe('metronomePulseHit', () => {
  it('is silent when the clock is stopped', () => {
    expect(metronomePulseHit(false, 0, 0)).toBe('')
  })

  it('marks beat 1 on the attack', () => {
    expect(metronomePulseHit(true, 0, 0)).toBe('1')
    expect(metronomePulseHit(true, 0, 0.49)).toBe('1')
  })

  it('rests on the off-beat half, including exactly 0.5', () => {
    expect(metronomePulseHit(true, 0, 0.5)).toBe('')
    expect(metronomePulseHit(true, 0, 0.99)).toBe('')
  })

  it('marks beats 2–4 as n on the attack', () => {
    expect(metronomePulseHit(true, 1, 1.0)).toBe('n')
    expect(metronomePulseHit(true, 2, 2.2)).toBe('n')
    expect(metronomePulseHit(true, 3, 3.49)).toBe('n')
  })

  it('rests on the off-beat of n', () => {
    expect(metronomePulseHit(true, 1, 1.5)).toBe('')
    expect(metronomePulseHit(true, 3, 3.8)).toBe('')
  })
})
