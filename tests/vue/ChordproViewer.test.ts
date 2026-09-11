import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

describe('ChordproViewer', () => {
  it('mounts jesus-1 and transpose changes displayed chords', async () => {
    const src = loadFixture(JESUS_1)
    const w = mount(ChordproViewer, {
      props: { source: src, theme: 'dark', autoHide: false },
      attachTo: document.body,
    })
    await flushPromises()
    expect(w.text()).toMatch(/Jesus/i)
    expect(w.text()).toMatch(/BEM SUAVE/i)
    const before = w.html()
    await w.get('[data-transpose-up]').trigger('click')
    await w.get('[data-transpose-up]').trigger('click')
    await flushPromises()
    expect(w.get('[data-display-key]').text()).toBe('A')
    expect(w.html()).not.toBe(before)
    w.unmount()
  })

  it('exposes light/dark/auto theme control', async () => {
    const w = mount(ChordproViewer, {
      props: { source: loadFixture(JESUS_1), theme: 'auto', autoHide: false },
      attachTo: document.body,
    })
    await flushPromises()
    const btn = w.get('[data-theme-btn]')
    expect(btn.text()).toMatch(/Auto/)
    expect(btn.find('[data-icon=sunMoon]').exists()).toBe(true)
    await btn.trigger('click')
    expect(w.get('[data-theme-btn]').text()).toMatch(/Claro/)
    expect(w.find('[data-theme-btn] [data-icon=sun]').exists()).toBe(true)
    await btn.trigger('click')
    expect(w.get('[data-theme-btn]').text()).toMatch(/Escuro/)
    expect(w.find('[data-theme-btn] [data-icon=moon]').exists()).toBe(true)
    expect(w.get('[data-cpv-root]').attributes('data-theme')).toBe('dark')
    w.unmount()
  })

  it('scroll control sets explicit text color (not UA black)', async () => {
    const w = mount(ChordproViewer, {
      props: { source: loadFixture(JESUS_1), theme: 'dark', autoHide: false },
      attachTo: document.body,
    })
    await flushPromises()
    const btn = w.get('[data-scroll]')
    expect(btn.attributes('style') || '').toMatch(/--text|--pill-ink/)
    w.unmount()
  })

  it('empty source shows empty copy', () => {
    const w = mount(ChordproViewer, { props: { source: '' } })
    expect(w.text()).toContain('Nenhuma cifra carregada')
    w.unmount()
  })
})
