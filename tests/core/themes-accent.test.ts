import { describe, expect, it } from 'vitest'
import { accentVars, listAccents } from '../../src/core/themes'

describe('accentVars', () => {
  it('keeps the named accents bit-for-bit', () => {
    expect(accentVars('verde', 'light')['--cpv-chord']).toBe('#17713C')
    expect(accentVars('verde', 'light')['--cpv-chord-soft']).toBe('rgba(23,113,60,0.10)')
    expect(accentVars('teal', 'dark')['--cpv-chord']).toBe('#6FD8E4')
  })

  it('falls back to verde when the token is not a name and not a colour', () => {
    expect(accentVars('indigo', 'light')['--cpv-chord']).toBe('#17713C')
    expect(accentVars('', 'dark')['--cpv-chord']).toBe('#84DFA6')
  })

  it('accepts a host hex and paints both themes from that hue', () => {
    const light = accentVars('#4F46E5', 'light')
    const dark = accentVars('#4F46E5', 'dark')
    expect(light['--cpv-chord']).toMatch(/^#[0-9A-F]{6}$/)
    expect(dark['--cpv-chord']).toMatch(/^#[0-9A-F]{6}$/)
    expect(light['--cpv-chord']).not.toBe(dark['--cpv-chord'])
    // Light mode needs a darker chord on the pale canvas; dark mode the reverse.
    const lr = Number.parseInt((light['--cpv-chord'] ?? '').slice(1, 3), 16)
    const dr = Number.parseInt((dark['--cpv-chord'] ?? '').slice(1, 3), 16)
    expect(lr).toBeLessThan(dr)
    expect(light['--cpv-chord-soft']).toMatch(/^rgba\(\d+,\d+,\d+,0\.10\)$/)
    expect(dark['--cpv-chord-edge']).toMatch(/^rgba\(\d+,\d+,\d+,0\.30\)$/)
  })

  it('accepts 3-digit hex and rgb() the same way', () => {
    const fromHex = accentVars('#46E', 'light')['--cpv-chord']
    const fromRgb = accentVars('rgb(68, 102, 238)', 'light')['--cpv-chord']
    expect(fromHex).toBe(fromRgb)
  })
})

describe('listAccents', () => {
  it('lists the named pair the host can pick without a hex', () => {
    expect(listAccents()).toEqual(['verde', 'teal'])
  })
})
