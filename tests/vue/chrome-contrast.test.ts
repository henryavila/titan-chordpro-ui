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

  /**
   * Beat 1 paints the title strip as ink. Remapping --chord / --muted / --chord-edge
   * on the strip itself makes nested fills the same colour as their surface.
   * Invert is keyed to `.cpv-head-chip` only — never to today's widget names.
   */
  it('beat-1 strip invert leaves tom chips as a nested surface', () => {
    const head = css.match(/\.cpv-head-hit-1\s*\{[^}]+\}/)?.[0] ?? ''
    expect(head).toMatch(/--veil:\s*var\(--downbeat\)/)
    expect(head).toMatch(/--text:\s*var\(--downbeat-ink\)/)
    expect(head, 'chord on the strip = inverted bg, so pill text vanishes').not.toMatch(
      /--chord:\s*var\(--downbeat\)/,
    )
    expect(head, 'edge = pill fill hides the +|Capo split').not.toMatch(
      /--chord-edge:\s*var\(--downbeat-ink\)/,
    )

    expect(css).toMatch(/\.cpv-head-hit-1\s+\.cpv-head-chip/)
    expect(css, 'invert must not whitelist widgets — new chips would miss it').not.toMatch(
      /\.cpv-head-hit-1\s+\.cpv-keypill/,
    )
    expect(css).not.toMatch(/\.cpv-head-hit-1\s+\[data-tone\]/)
    expect(css).not.toMatch(/\.cpv-head-hit-1\s+\.cpv-head-pos/)

    const chips = css.match(
      /\.cpv-head-hit-1\s+\.cpv-head-chip\s*\{[^}]+\}/,
    )?.[0] ?? ''
    expect(chips).toMatch(/--chord:\s*var\(--downbeat\)/)
    expect(chips).toMatch(/--text:\s*var\(--downbeat\)/)
    expect(chips).toMatch(/--muted:\s*color-mix\(in srgb,\s*var\(--downbeat\)\s+72%/)
    expect(chips).not.toMatch(/--muted:\s*color-mix\(in srgb,\s*var\(--downbeat-ink\)/)
    expect(chips).toMatch(/--chord-edge:\s*color-mix\(in srgb,\s*var\(--downbeat\)/)
  })

  it('tom pill keeps air between − / + / capo so the pulse cannot glue them', () => {
    const pill = css.match(/\.cpv-keypill\s*\{[^}]+\}/)?.[0] ?? ''
    const gap = pill.match(/gap:\s*([\d.]+)px/)?.[1]
    expect(Number(gap), `keypill gap was ${gap}`).toBeGreaterThanOrEqual(4)
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
