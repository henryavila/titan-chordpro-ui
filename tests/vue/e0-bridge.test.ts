import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

describe('E0 Vue bridge', () => {
  it('view↔edit, source pane, dirty, transpose reset', async () => {
    const src = loadFixture(JESUS_1)
    const w = mount(ChordproViewer, {
      props: { source: src, theme: 'dark', autoHide: false, mode: 'view', modes: 'content' },
      attachTo: document.body,
    })
    await flushPromises()
    await w.get('[data-transpose-up]').trigger('click')
    await w.get('[data-transpose-up]').trigger('click')
    await flushPromises()
    expect(w.get('[data-display-key]').text()).toBe('G')
    expect(w.get('[data-tone-shift]').text()).toMatch(/tocando em A/)
    await w.get('[data-edit]').trigger('click')
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

  it('content edit emits update:source so a host can persist the official chart', async () => {
    const src = loadFixture(JESUS_1)
    const w = mount(ChordproViewer, {
      props: { source: src, theme: 'dark', autoHide: false, modes: 'content' },
      attachTo: document.body,
    })
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-source]').trigger('click')
    await w.get('textarea[aria-label="Fonte ChordPro"]').setValue(`${src}\n{c:(NOTA HOST)}\n`)
    await flushPromises()
    expect(w.emitted('update:source')?.at(-1)?.[0]).toContain('NOTA HOST')
    expect(typeof (w.vm as { getSource?: () => string }).getSource).toBe('function')
    expect((w.vm as { getSource: () => string }).getSource()).toContain('NOTA HOST')
    w.unmount()
  })

  it('local edit does not emit update:source — the official chart stays put', async () => {
    const src = loadFixture(JESUS_1)
    const w = mount(ChordproViewer, {
      props: { source: src, theme: 'dark', autoHide: false, modes: 'local', songId: 'jesus-1' },
      attachTo: document.body,
    })
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    const before = w.emitted('update:source')?.length ?? 0
    const li = src.split('\n').findIndex((line) => line.includes('Tu És a minha'))
    const row = w.find(`[data-row="${li}"]`)
    if (row.exists()) {
      await row.trigger('click')
      await flushPromises()
      const input = w.find('input[aria-label="Letra desta linha"]')
      if (input.exists()) {
        await input.setValue('Jesus, Tu És a minha vida. (meu)')
        await input.trigger('blur')
        await flushPromises()
      }
    }
    expect(w.emitted('update:source')?.length ?? 0).toBe(before)
    w.unmount()
  })
})
