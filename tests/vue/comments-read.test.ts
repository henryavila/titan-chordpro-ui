import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

const css = readFileSync(join(process.cwd(), 'src/vue/cpv.css'), 'utf8')

function rule(selector: string): string {
  const re = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]+\\}`)
  return css.match(re)?.[0] ?? ''
}

describe('rehearsal comments are readable stage directions', () => {
  it('comment type is body size, not an 11px muted uppercase label', () => {
    const text = rule('.cpv-comment-text')
    expect(text, 'still the 11px canvas label').not.toMatch(/font-size:\s*11px/)
    expect(text).not.toMatch(/text-transform:\s*uppercase/)
    expect(text).not.toMatch(/letter-spacing:\s*0\.14em/)
    expect(text).not.toMatch(/color:\s*var\(--muted\)/)
    expect(text).toMatch(/color:\s*var\(--lyric\)/)
    expect(text).toMatch(/overflow-wrap:\s*anywhere/)
    expect(text).toMatch(/font-size:\s*calc\(\s*var\(--cpv-lyric-px/)
  })

  it('does not compete with chords or the chorus card', () => {
    const text = rule('.cpv-comment-text')
    expect(text).not.toMatch(/color:\s*var\(--chord\)/)
    expect(text).not.toMatch(/color:\s*var\(--text\)/)
    const box = rule('.cpv-comment')
    expect(box).not.toMatch(/background:\s*var\(--(?:block|surface|veil|chord-soft)/)
    expect(box).not.toMatch(/border-left:\s*\d+px\s+solid\s+var\(--chord\)/)
    expect(box).not.toMatch(/border-radius:/)
    expect(box).not.toMatch(/position:\s*(absolute|fixed)/)
    const dot = rule('.cpv-comment-dot')
    expect(dot).not.toMatch(/background:\s*var\(--chord\)/)
    expect(dot).not.toMatch(/display:\s*none/)
  })

  it('the hairline does not steal the row from a long comment', () => {
    expect(rule('.cpv-comment-line')).toMatch(/display:\s*none/)
  })

  it('execução items are readable prose, not tiny muted mono', () => {
    const item = rule('.cpv-note-item')
    expect(item).not.toMatch(/font-size:\s*11\.5px/)
    expect(item).not.toMatch(/color:\s*var\(--muted\)/)
    expect(item).toMatch(/color:\s*var\(--text\)/)
    expect(item).not.toMatch(/font-family:\s*'Space Mono'/)
    expect(item).toMatch(/overflow-wrap:\s*anywhere/)
  })
})

describe('comment size follows the lyric scale', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('hands --cpv-lyric to the chart so comments scale with A±', async () => {
    const w = mount(ChordproViewer, {
      props: { source: loadFixture(JESUS_1), theme: 'dark', autoHide: false },
      attachTo: document.body,
    })
    await flushPromises()
    const chart = w.get('.cpv-chart')
    expect(chart.attributes('style') ?? '').toMatch(/--cpv-lyric-px/)
    expect(w.find('.cpv-comment').exists() || w.find('.cpv-note').exists()).toBe(true)
    w.unmount()
  })
})
