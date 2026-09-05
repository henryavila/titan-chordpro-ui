import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

describe('E0 Vue bridge', () => {
  it('view↔edit, source pane, dirty, transpose reset', async () => {
    const src = loadFixture(JESUS_1)
    const w = mount(ChordproViewer, {
      props: { source: src, theme: 'dark', autoHide: false, mode: 'view' },
      attachTo: document.body,
    })
    await flushPromises()
    await w.get('[data-transpose-up]').trigger('click')
    await w.get('[data-transpose-up]').trigger('click')
    await flushPromises()
    expect(w.get('[data-display-key]').text()).toBe('A')
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    // Both saves are allowed here, so the editor asks where this one lands.
    await w.get('[data-mode-content]').trigger('click')
    await flushPromises()
    expect(w.text()).toMatch(/Para todos/)
    expect(w.text()).toContain('Ler')
    await w.get('[data-source]').trigger('click')
    expect(w.find('textarea[aria-label="Fonte ChordPro"]').exists()).toBe(true)
    const ta = w.get('textarea[aria-label="Fonte ChordPro"]')
    await ta.setValue(src + '\n{c:(NOTA E0)}\n')
    await flushPromises()
    expect(w.emitted('dirty')?.at(-1)?.[0]).toBe(true)
    await w.get('[data-read]').trigger('click')
    await flushPromises()
    expect(w.text()).not.toMatch(/Para todos/)
    w.unmount()
  })
})
