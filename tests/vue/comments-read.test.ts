import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TitanChordpro } from '../../src/vue/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

const css = readFileSync(join(process.cwd(), 'src/vue/titan-chordpro.css'), 'utf8')

function rule(selector: string): string {
  const re = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]+\\}`)
  return css.match(re)?.[0] ?? ''
}

describe('rehearsal comments are readable stage directions', () => {
  it('comment type is near lyric size, upright, washed — not tiny italic or uppercase', () => {
    const text = rule('.titan-chordpro-comment-text')
    expect(text, 'still the 11px canvas label').not.toMatch(/font-size:\s*11px/)
    expect(text).not.toMatch(/text-transform:\s*uppercase/)
    expect(text).not.toMatch(/letter-spacing:\s*0\.14em/)
    expect(text).toMatch(/color:\s*color-mix\(in srgb,\s*var\(--muted\) 62%,\s*var\(--canvas\)/)
    expect(text).toMatch(/font-weight:\s*600/)
    expect(text).not.toMatch(/font-style:\s*italic/)
    expect(text).toMatch(/overflow-wrap:\s*anywhere/)
    expect(text).toMatch(/font-size:\s*calc\(\s*var\(--titan-chordpro-lyric-px[^)]*\)\s*\*\s*0\.88/)
    expect(css).toMatch(/\.titan-chordpro-comment-text::before\s*\{[^}]*content:\s*'\('/)
    expect(css).toMatch(/\.titan-chordpro-comment-text::after\s*\{[^}]*content:\s*'\)'/)
  })

  it('does not compete with chords or the chorus card', () => {
    const text = rule('.titan-chordpro-comment-text')
    expect(text).not.toMatch(/color:\s*var\(--chord\)/)
    expect(text).not.toMatch(/color:\s*var\(--text\)/)
    expect(text).not.toMatch(/color:\s*var\(--lyric\)/)
    const box = rule('.titan-chordpro-comment')
    expect(box).toMatch(/background:\s*none/)
    expect(box).toMatch(/border:\s*0/)
    expect(box).not.toMatch(/border-radius:/)
    expect(box).not.toMatch(/position:\s*(absolute|fixed)/)
    const note = rule('.titan-chordpro-note')
    expect(note).toMatch(/background:\s*none/)
    expect(note).toMatch(/border:\s*0/)
    expect(note).not.toMatch(/border-radius:/)
    expect(rule('.titan-chordpro-comment-dot')).toMatch(/display:\s*none/)
    expect(box).toMatch(/margin:\s*0 16px 0/)
    expect(css).toMatch(
      /\.titan-chordpro-blockrow:has\(\.titan-chordpro-comment\)\s*\+\s*\.titan-chordpro-blockrow \.titan-chordpro-block[^}]*padding-top:\s*1px/,
    )
  })

  it('the hairline does not steal the row from a long comment', () => {
    expect(rule('.titan-chordpro-comment-line')).toMatch(/display:\s*none/)
  })

  it('execução items are readable prose, not tiny italic mono', () => {
    const item = rule('.titan-chordpro-note-item')
    expect(item).not.toMatch(/font-size:\s*11\.5px/)
    expect(item).toMatch(/color:\s*color-mix\(in srgb,\s*var\(--muted\) 62%,\s*var\(--canvas\)/)
    expect(item).toMatch(/font-weight:\s*600/)
    expect(item).not.toMatch(/font-style:\s*italic/)
    expect(item).not.toMatch(/font-family:\s*'Space Mono'/)
    expect(item).toMatch(/overflow-wrap:\s*anywhere/)
    expect(item).toMatch(/font-size:\s*calc\(\s*var\(--titan-chordpro-lyric-px[^)]*\)\s*\*\s*0\.88/)
  })
})

describe('comment size follows the lyric scale', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('hands --titan-chordpro-lyric to the chart so comments scale with A±', async () => {
    const w = mount(TitanChordpro, {
      props: { source: loadFixture(JESUS_1), theme: 'dark', autoHide: false },
      attachTo: document.body,
    })
    await flushPromises()
    const chart = w.get('.titan-chordpro-chart')
    expect(chart.attributes('style') ?? '').toMatch(/--titan-chordpro-lyric-px/)
    expect(w.find('.titan-chordpro-comment').exists() || w.find('.titan-chordpro-note').exists()).toBe(true)
    w.unmount()
  })
})
