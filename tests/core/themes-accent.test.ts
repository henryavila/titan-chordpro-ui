import { describe, expect, it } from 'vitest'
import { accentVars, listAccents } from '../../src/core/themes'

describe('accentVars', () => {
  it('keeps the named accents bit-for-bit', () => {
    expect(accentVars('verde', 'light')['--titan-chordpro-chord']).toBe('#17713C')
    expect(accentVars('verde', 'light')['--titan-chordpro-chord-soft']).toBe('rgba(23,113,60,0.10)')
    expect(accentVars('teal', 'dark')['--titan-chordpro-chord']).toBe('#6FD8E4')
  })

  it('falls back to verde when the token is not a name and not a colour', () => {
    expect(accentVars('indigo', 'light')['--titan-chordpro-chord']).toBe('#17713C')
    expect(accentVars('', 'dark')['--titan-chordpro-chord']).toBe('#84DFA6')
  })

  it('accepts a host hex and paints both themes from that hue', () => {
    const light = accentVars('#4F46E5', 'light')
    const dark = accentVars('#4F46E5', 'dark')
    expect(light['--titan-chordpro-chord']).toMatch(/^#[0-9A-F]{6}$/)
    expect(dark['--titan-chordpro-chord']).toMatch(/^#[0-9A-F]{6}$/)
    expect(light['--titan-chordpro-chord']).not.toBe(dark['--titan-chordpro-chord'])
    // Light mode needs a darker chord on the pale canvas; dark mode the reverse.
    const lr = Number.parseInt((light['--titan-chordpro-chord'] ?? '').slice(1, 3), 16)
    const dr = Number.parseInt((dark['--titan-chordpro-chord'] ?? '').slice(1, 3), 16)
    expect(lr).toBeLessThan(dr)
    expect(light['--titan-chordpro-chord-soft']).toMatch(/^rgba\(\d+,\d+,\d+,0\.10\)$/)
    expect(dark['--titan-chordpro-chord-edge']).toMatch(/^rgba\(\d+,\d+,\d+,0\.30\)$/)
  })

  it('accepts 3-digit hex and rgb() the same way', () => {
    const fromHex = accentVars('#46E', 'light')['--titan-chordpro-chord']
    const fromRgb = accentVars('rgb(68, 102, 238)', 'light')['--titan-chordpro-chord']
    expect(fromHex).toBe(fromRgb)
  })

  it('paints the focus ring from the same primary, not a leftover blue', () => {
    const teal = accentVars('teal', 'dark')
    expect(teal['--titan-chordpro-focus']).toBe(teal['--titan-chordpro-chord'])
    const hex = accentVars('#4F46E5', 'light')
    expect(hex['--titan-chordpro-focus']).toBe(hex['--titan-chordpro-chord'])
    expect(hex['--titan-chordpro-focus']).not.toBe('#2563EB')
  })

  it('keeps every fill/edge/glow on the same RGB as the primary', () => {
    const v = accentVars('#4F46E5', 'dark')
    const rgb = (v['--titan-chordpro-chord-soft'] ?? '').match(/^rgba\((\d+,\d+,\d+),/)?.[1]
    expect(rgb).toMatch(/^\d+,\d+,\d+$/)
    for (const k of [
      '--titan-chordpro-chord-soft',
      '--titan-chordpro-chord-edge',
      '--titan-chordpro-chord-hover',
      '--titan-chordpro-chord-fill',
      '--titan-chordpro-block',
      '--titan-chordpro-block-line',
      '--titan-chordpro-glow',
    ] as const) {
      expect(v[k], k).toContain(`rgba(${rgb},`)
    }
  })
})

describe('listAccents', () => {
  it('lists the named pair the host can pick without a hex', () => {
    expect(listAccents()).toEqual(['verde', 'teal'])
  })
})
