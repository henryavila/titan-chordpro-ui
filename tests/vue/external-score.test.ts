import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import ImportScoreDialog from '../../src/vue/edit/ImportScoreDialog.vue'
import ChordproViewer from '../../src/vue/ChordproViewer.vue'
import { normalizeSource, writeScoreReference } from '../../src/core'

const original = normalizeSource(readFileSync('fixtures/013-ele-vive-em-mim-partitura.cho', 'utf8'))
const reference = writeScoreReference({ src: '/solo.gp', track: 1, start: 1, end: 1 })

describe('external solo integration', () => {
  it('renders the external score separately from the legacy editor; hides it in lyrics only', async () => {
    const wrapper = mount(ChordproViewer, {
      props: { source: `${original}\n${reference}`, theme: 'light', autoHide: false },
      global: { stubs: { ExternalScore: { props: ['text'], template: '<div data-external-stub>{{ text }}</div>' } } },
    })
    await flushPromises()
    expect(wrapper.find('[data-external-stub]').text()).toContain('src="/solo.gp"')
    await wrapper.setProps({ lens: 'letra' })
    expect(wrapper.find('[data-external-stub]').exists()).toBe(false)
    wrapper.unmount()
  })
  it('keeps the dialog and source untouched when host storage rejects an upload', async () => {
    const bytes = readFileSync('fixtures/notation/notes.gp')
    const chosen = new File([bytes], 'solo.gp')
    Object.defineProperty(chosen, 'arrayBuffer', { value: async () => Uint8Array.from(bytes).buffer })
    const create = vi.fn(() => 'blob:preview')
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = create
      static revokeObjectURL = vi.fn()
    })
    const uploadScore = vi.fn().mockRejectedValue(new Error('Armazenamento indisponível'))
    const wrapper = mount(ImportScoreDialog, {
      props: { uploadScore }, global: { stubs: { ExternalScore: true } },
    })
    try {
      const input = wrapper.get('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [chosen] })
      await input.trigger('change')
      await vi.waitFor(() => expect(wrapper.find('select').exists()).toBe(true))
      await flushPromises()
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(uploadScore).toHaveBeenCalledWith(chosen)
      expect(wrapper.get('[role="alert"]').text()).toContain('Armazenamento indisponível')
      expect(wrapper.emitted('save')).toBeUndefined()
      expect(wrapper.emitted('close')).toBeUndefined()
    } finally { wrapper.unmount(); vi.unstubAllGlobals() }
  })
})
