import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/vue/cpv.css'), 'utf8')

describe('chrome contrast vs template', () => {
  it('buttons reset UA black via color-scheme + explicit --text', () => {
    expect(css).toMatch(/color-scheme:\s*dark/)
    expect(css).toMatch(/color-scheme:\s*light/)
    expect(css).toMatch(/\.cpv-root button[\s\S]*?color:\s*var\(--text\)/)
    expect(css).toMatch(/appearance:\s*none/)
  })

  it('icons inherit color instead of initial currentColor black', () => {
    expect(css).toMatch(/\.cpv-ico[\s\S]*?color:\s*inherit/)
  })

  it('beat numbers stay bare; only beat 1 pulses in the theme colour', () => {
    const idle = css.match(/\.cpv-met-beat\s*\{[^}]+\}/)?.[0] ?? ''
    expect(idle).toMatch(/background:\s*transparent/)
    expect(idle).toMatch(/border:\s*0/)
    const pulse = css.match(/\.cpv-met-beat\.is-now\s*\{[^}]+\}/)?.[0] ?? ''
    expect(pulse).toMatch(/background:\s*var\(--beat-rest\)/)
    expect(pulse).toMatch(/color:\s*var\(--beat-rest-ink\)/)
    const one = css.match(/\.cpv-met-beat\.is-now\.is-one\s*\{[^}]+\}/)?.[0] ?? ''
    expect(one).toMatch(/background:\s*var\(--chord\)/)
    expect(one).toMatch(/color:\s*var\(--chord-ink\)/)
    expect(css).toMatch(/--beat-rest:\s*#E8EAF0/)
    expect(css).toMatch(/\[data-theme='light'\][\s\S]*?--beat-rest:\s*#FFFFFF/)
    expect(css).not.toMatch(/\.cpv-met-hit-1\s+\.cpv-met-beat\.is-now/)
    expect(css).not.toMatch(/\.cpv-met-hit-n\s+\.cpv-met-beat\.is-now/)
  })

  it('toast arrives and leaves by fade and blur, not a jump', () => {
    const block = css.match(/\.cpv-toast\s*\{[^}]+\}/)?.[0] ?? ''
    expect(block, 'toast still uses the rise jump').not.toMatch(/cpv-rise/)
    expect(block).not.toMatch(/translateY/)
    expect(css).toMatch(/@keyframes\s+cpv-toast-in[\s\S]*?filter:\s*blur/)
    expect(css).toMatch(/\.cpv-toast\.is-out[\s\S]*?opacity:\s*0/)
    expect(css).toMatch(/\.cpv-toast\.is-out[\s\S]*?filter:\s*blur/)
  })
})
