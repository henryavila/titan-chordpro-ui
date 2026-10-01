import { readFileSync } from 'node:fs'
import { flushPromises, mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import ChordproViewer from '../../src/vue/ChordproViewer.vue'
import ImportScoreDialog from '../../src/vue/edit/ImportScoreDialog.vue'
import { layoutChart, normalizeSource, parse, writeScoreReference } from '../../src/core'

const source = normalizeSource(readFileSync('fixtures/013-ele-vive-em-mim-partitura.cho', 'utf8'))
const reference = writeScoreReference({ src: 'fixtures/notation/notes.gp', track: 1, start: 1 })

it('inserts Guitar Pro after the introduction and preserves its position through undo, redo, save and host echo', async () => {
  const wrapper = mount(ChordproViewer, {
    props: { source, modes: 'content', theme: 'light', autoHide: false, uploadScore: async () => ({ ref: 'fixtures/notation/notes.gp' }) },
    global: { stubs: { ExternalScore: { props: ['text'], template: '<div data-external-stub>{{ text }}</div>' } } },
  })
  try {
    await flushPromises()
    await wrapper.get('[data-edit]').trigger('click')
    await flushPromises()
    if (wrapper.find('[data-mode-content]').exists()) await wrapper.get('[data-mode-content]').trigger('click')
    const at = source.split('\n').findIndex(l => l.startsWith('Por [G]onde'))
    await wrapper.get(`[data-insert-at="${at}"]`).trigger('click')
    await wrapper.findAll('.cpv-insert-item').find(b => b.text().includes('Guitar Pro'))!.trigger('click')
    wrapper.getComponent(ImportScoreDialog).vm.$emit('save', reference)
    await flushPromises()
    const expected = source.split('\n')
    expected.splice(at, 0, reference, '')
    const current = () => (wrapper.vm as unknown as { getSource(): string }).getSource()
    expect(current()).toBe(expected.join('\n'))
    await wrapper.get('[data-undo]').trigger('click')
    await flushPromises()
    expect(current()).toBe(source)
    expect(wrapper.find('[data-external-stub]').exists()).toBe(false)
    await wrapper.get('[data-redo]').trigger('click')
    await flushPromises()
    expect(current()).toBe(expected.join('\n'))
    const bs = layoutChart(parse(current()))
    const bi = bs.findIndex(b => b.kind === 'score' && b.text === reference)
    expect(bi).toBeGreaterThan(0)
    expect(wrapper.get('[data-external-stub]').element.closest('[data-block]')?.getAttribute('data-block')).toBe(String(bi))
    await wrapper.get('[data-save]').trigger('click')
    expect(wrapper.emitted('save')?.at(-1)).toEqual([expected.join('\n')])
    await wrapper.setProps({ source: expected.join('\n') })
    expect(current()).toBe(expected.join('\n'))
  } finally { wrapper.unmount() }
})
