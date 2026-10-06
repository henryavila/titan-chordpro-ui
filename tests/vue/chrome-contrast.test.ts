import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/vue/titan-chordpro.css'), 'utf8')

describe('chrome contrast vs template', () => {
  it('buttons reset UA black via color-scheme + explicit --text', () => {
    expect(css).toMatch(/color-scheme:\s*dark/)
    expect(css).toMatch(/color-scheme:\s*light/)
    expect(css).toMatch(/\.titan-chordpro-root button[\s\S]*?color:\s*var\(--text\)/)
    expect(css).toMatch(/appearance:\s*none/)
  })

  it('icons inherit color instead of initial currentColor black', () => {
    expect(css).toMatch(/\.titan-chordpro-ico[\s\S]*?color:\s*inherit/)
  })

  it('beat numbers stay bare; beat 1 is ink, 2–4 wear the theme', () => {
    const idle = css.match(/\.titan-chordpro-met-beat\s*\{[^}]+\}/)?.[0] ?? ''
    expect(idle).toMatch(/background:\s*transparent/)
    expect(idle).toMatch(/border:\s*0/)
    const pulse = css.match(/\.titan-chordpro-met-beat\.is-now\s*\{[^}]+\}/)?.[0] ?? ''
    expect(pulse).toMatch(/background:\s*var\(--chord\)/)
    expect(pulse).toMatch(/color:\s*var\(--chord-ink\)/)
    expect(pulse).not.toMatch(/--beat-rest/)
    const one = css.match(/\.titan-chordpro-met-beat\.is-now\.is-one\s*\{[^}]+\}/)?.[0] ?? ''
    expect(one).toMatch(/background:\s*var\(--downbeat\)/)
    expect(one).toMatch(/color:\s*var\(--downbeat-ink\)/)
    expect(css).toMatch(/--beat-rest:\s*#E8EAF0/)
    expect(css).toMatch(/\[data-theme='light'\][\s\S]*?--beat-rest:\s*#FFFFFF/)
    expect(css).not.toMatch(/\.titan-chordpro-met-hit-1\s+\.titan-chordpro-met-beat\.is-now/)
    expect(css).not.toMatch(/\.titan-chordpro-met-hit-n\s+\.titan-chordpro-met-beat\.is-now/)
  })

  /**
   * Beat 1 paints the title strip as ink. Remapping --chord / --muted / --chord-edge
   * on the strip itself makes nested fills the same colour as their surface.
   * Invert is keyed to `.titan-chordpro-head-chip` only — never to today's widget names.
   */
  it('beat-1 strip invert leaves tom chips as a nested surface', () => {
    const head = css.match(/\.titan-chordpro-head-hit-1\s*\{[^}]+\}/)?.[0] ?? ''
    expect(head).toMatch(/--veil:\s*var\(--downbeat\)/)
    expect(head).toMatch(/--text:\s*var\(--downbeat-ink\)/)
    expect(head, 'chord on the strip = inverted bg, so pill text vanishes').not.toMatch(
      /--chord:\s*var\(--downbeat\)/,
    )
    expect(head, 'edge = pill fill hides the +|Capo split').not.toMatch(
      /--chord-edge:\s*var\(--downbeat-ink\)/,
    )

    expect(css).toMatch(/\.titan-chordpro-head-hit-1\s+\.titan-chordpro-head-chip/)
    expect(css, 'invert must not whitelist widgets — new chips would miss it').not.toMatch(
      /\.titan-chordpro-head-hit-1\s+\.titan-chordpro-keypill/,
    )
    expect(css).not.toMatch(/\.titan-chordpro-head-hit-1\s+\[data-tone\]/)
    expect(css).not.toMatch(/\.titan-chordpro-head-hit-1\s+\.titan-chordpro-head-pos/)

    const chips = css.match(
      /\.titan-chordpro-head-hit-1\s+\.titan-chordpro-head-chip\s*\{[^}]+\}/,
    )?.[0] ?? ''
    expect(chips).toMatch(/--chord:\s*var\(--downbeat\)/)
    expect(chips).toMatch(/--text:\s*var\(--downbeat\)/)
    expect(chips).toMatch(/--muted:\s*color-mix\(in srgb,\s*var\(--downbeat\)\s+72%/)
    expect(chips).not.toMatch(/--muted:\s*color-mix\(in srgb,\s*var\(--downbeat-ink\)/)
    expect(chips).toMatch(/--chord-edge:\s*color-mix\(in srgb,\s*var\(--downbeat\)/)
  })

  it('beat-n strip paints chord as a square pulse, chips stay a nested surface', () => {
    const head = css.match(/\.titan-chordpro-head-hit-n\s*\{[^}]+\}/)?.[0] ?? ''
    expect(head, 'n still fades via keyframes').not.toMatch(/animation:/)
    expect(head).toMatch(/--veil:\s*var\(--chord\)/)
    expect(head).toMatch(/--text:\s*var\(--chord-ink\)/)
    expect(head, 'remapping --chord on the strip eats the chips').not.toMatch(
      /--chord:\s*var\(--chord-ink\)/,
    )

    expect(css).toMatch(/\.titan-chordpro-head-hit-n\s+\.titan-chordpro-head-chip/)
    expect(css).not.toMatch(/@keyframes\s+titan-chordpro-head-n/)

    const chips = css.match(
      /\.titan-chordpro-head-hit-n\s+\.titan-chordpro-head-chip\s*\{[^}]+\}/,
    )?.[0] ?? ''
    expect(chips).toMatch(/--chord-soft:\s*var\(--chord-ink\)/)
    expect(chips).toMatch(/--text:\s*var\(--chord\)/)
    expect(chips).not.toMatch(/--chord:\s*var\(--downbeat\)/)
    expect(chips).toMatch(/--chord-edge:\s*color-mix\(in srgb,\s*var\(--chord\)/)
    expect(chips).toMatch(/--chord-hover:\s*color-mix\(in srgb,\s*var\(--chord\)/)
    expect(chips).not.toMatch(/--chord-edge:\s*color-mix\(in srgb,\s*var\(--chord-ink\)/)
  })

  it('tom pill keeps air between − / + / capo so the pulse cannot glue them', () => {
    const pill = css.match(/\.titan-chordpro-keypill\s*\{[^}]+\}/)?.[0] ?? ''
    const gap = pill.match(/gap:\s*([\d.]+)px/)?.[1]
    expect(Number(gap), `keypill gap was ${gap}`).toBeGreaterThanOrEqual(4)
  })

  it('toast arrives and leaves by fade and blur, not a jump', () => {
    const block = css.match(/\.titan-chordpro-toast\s*\{[^}]+\}/)?.[0] ?? ''
    expect(block, 'toast still uses the rise jump').not.toMatch(/titan-chordpro-rise/)
    expect(block).not.toMatch(/translateY/)
    expect(css).toMatch(/@keyframes\s+titan-chordpro-toast-in[\s\S]*?filter:\s*blur/)
    expect(css).toMatch(/\.titan-chordpro-toast\.is-out[\s\S]*?opacity:\s*0/)
    expect(css).toMatch(/\.titan-chordpro-toast\.is-out[\s\S]*?filter:\s*blur/)
  })
})
