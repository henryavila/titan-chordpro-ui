import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { versionMenuOffset } from '../../src/vue/ui/TitanChordproVersionMenuOffset'

const css = readFileSync(join(process.cwd(), 'src/vue/titan-chordpro.css'), 'utf8')

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`(^|\\n)${escaped}\\s*\\{[^}]*\\}`))?.[0] ?? ''
}

describe('version menu offset', () => {
  const limitLeft = 0
  const limitRight = 390
  const margin = 8

  it('stays put when the menu fits inside the margins', () => {
    expect(versionMenuOffset(100, 300, limitLeft, limitRight, margin)).toBe(0)
  })

  it('pulls left when the menu passes the right margin', () => {
    const shift = versionMenuOffset(300, 660, limitLeft, limitRight, margin)
    expect(shift).toBe(-278)
    expect(300 + shift + 360).toBe(limitRight - margin)
  })

  it('pushes right when the menu passes the left margin', () => {
    const shift = versionMenuOffset(-40, 140, limitLeft, limitRight, margin)
    expect(shift).toBe(48)
    expect(-40 + shift).toBe(limitLeft + margin)
  })

  it('aligns left with the margin when the menu is wider than the limit', () => {
    const shift = versionMenuOffset(0, 500, limitLeft, limitRight, margin)
    expect(shift).toBe(8)
    expect(0 + shift).toBe(limitLeft + margin)
  })

  it('leaves a menu exactly as wide as the band alone', () => {
    expect(versionMenuOffset(8, 382, limitLeft, limitRight, margin)).toBe(0)
  })
})

describe('the version menu is a floating surface', () => {
  it('does not paint its own background over the head', () => {
    const rule = block('.titan-chordpro-version-menu')
    expect(rule).not.toBe('')
    expect(rule).not.toMatch(/(^|[;\s])background\s*:/)
    expect(rule).not.toMatch(/(^|[;\s])border\s*:/)
  })

  it('wears the shared veil-2 surface', () => {
    const veil = block('.titan-chordpro-veil-2')
    expect(veil).toMatch(/background:\s*var\(--veil-2\)/)
    expect(veil).toMatch(/box-shadow:\s*var\(--shadow\)/)
  })

  it('rows and actions inherit the Titan font at 13px', () => {
    const rule = css.match(/\.titan-chordpro-version-row,\s*\.titan-chordpro-version-action\s*\{[^}]*\}/)?.[0] ?? ''
    expect(rule).toMatch(/font-family:\s*inherit/)
    expect(rule).toMatch(/font-size:\s*13px/)
  })
})
