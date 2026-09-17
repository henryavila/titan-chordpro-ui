import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import StrumStrip from '../../src/vue/StrumStrip.vue'
import { memoryStore, patternFromCc } from '../../src/core'

describe('StrumStrip', () => {
  it('renders filled and ghost strokes', () => {
    const pattern = patternFromCc(
      [7, 23, 19, 24],
      ['1', 'x', '2', 'x'],
      100,
      'Padrão',
    )
    const w = mount(StrumStrip, { props: { pattern, beatClock: 0, barBeats: 2 } })
    expect(w.find('[data-strum-strip]').exists()).toBe(true)
    expect(w.findAll('[data-strum-i]')).toHaveLength(4)
    expect(w.text()).toContain('100 BPM')
    expect(w.find('[data-strum-i="0"]').classes().join(' ')).toContain('strum-active')
  })

  it('lights one arrow at a time from the beat clock', () => {
    // grid 4, 2 beats → 2 slots per beat
    const pattern = patternFromCc([7, 23, 19, 7], ['1', 'x', '2', 'x'], 120, 'Padrão')
    const w = mount(StrumStrip, { props: { pattern, beatClock: 0.6, barBeats: 2 } })
    // 0.6 * 2 = 1.2 → slot 1
    expect(w.find('[data-strum-i="1"]').classes()).toContain('strum-active')
    expect(w.find('[data-strum-i="0"]').classes()).not.toContain('strum-active')
  })

  it('marks changed slots on the visualizer when comparing two patterns', () => {
    const previous = patternFromCc([7, 23, 19, 7], ['1', 'x', '2', 'x'], 120, 'A')
    const proposed = patternFromCc([19, 23, 19, 7], ['1', 'x', '2', 'x'], 120, 'B')
    const w = mount(StrumStrip, { props: { pattern: proposed, compare: previous } })
    expect(w.get('[data-strum-i="0"]').attributes('data-strum-diff')).toBe('changed')
    expect(w.get('[data-strum-was]').text()).toBe('↓')
    expect(w.get('[data-strum-i="1"]').attributes('data-strum-diff')).toBe('same')
    w.unmount()
  })

  it('exposes a full-width row so slots can fill the reading column', () => {
    const pattern = patternFromCc([7, 23, 19, 7], ['1', 'x', '2', 'x'], 120, 'Padrão')
    const w = mount(StrumStrip, { props: { pattern } })
    expect(w.find('[data-strum-row]').classes()).toContain('strum-row')
    expect(w.findAll('[data-strum-i]')).toHaveLength(4)
  })
})

describe('viewer batida toggle', () => {
  it('shows the batida button when the chart has x_strum', async () => {
    const source = `{title:Teste}
{key:D}
{tempo:71}
{time:4/4}
{duration:04:00}
{x_strum: bpm=71; meter=4/4; grid=8; label=Padrão; pat=DuDu DuDU}
{c:Verso}
[D]Oi
`
    const w = mount(ChordproViewer, {
      props: { source, storage: memoryStore(), autoHide: false },
      attachTo: document.body,
    })
    expect(w.find('[data-strum-btn]').exists()).toBe(true)
    expect(w.find('[data-strum-strip]').exists()).toBe(false)
    await w.get('[data-strum-btn]').trigger('click')
    expect(w.find('[data-strum-strip]').exists()).toBe(true)
    // Edit affordance lives in Para todos edit chrome — strip is read-only.
    expect(w.find('[data-strum-edit]').exists()).toBe(false)
    w.unmount()
  })

  it('strip remains a read-only projection (no slot buttons)', () => {
    const pattern = patternFromCc([7, 23, 19, 7], ['1', 'x', '2', 'x'], 120, 'Padrão')
    const w = mount(StrumStrip, {
      props: { pattern, beatClock: 0, barBeats: 2, canEdit: false },
    })
    expect(w.find('[data-strum-edit]').exists()).toBe(false)
    expect(w.findAll('[data-strum-i]').every((n) => n.element.tagName !== 'BUTTON')).toBe(true)
    w.unmount()
  })
})
