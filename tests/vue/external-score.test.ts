import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import ImportScoreDialog from '../../src/vue/edit/ImportScoreDialog.vue'
import TitanChordpro from '../../src/vue/TitanChordpro.vue'
import { layoutChart, parse, normalizeSource, writeScoreReference } from '../../src/core'

const original = normalizeSource(readFileSync('fixtures/013-ele-vive-em-mim-partitura.cho', 'utf8'))
const reference = writeScoreReference({ src: '/solo.gp', track: 1, start: 1, end: 1 })

describe('external solo integration', () => {
  it('renders the external score separately from the legacy editor; hides it in lyrics only', async () => {
    const wrapper = mount(TitanChordpro, {
      props: { source: `${original}\n${reference}`, theme: 'light', autoHide: false },
      global: { stubs: { ExternalScore: { props: ['text'], template: '<div data-external-stub>{{ text }}</div>' } } },
    })
    await flushPromises()
    expect(wrapper.find('[data-external-stub]').text()).toContain('src="/solo.gp"')
    await wrapper.setProps({ lens: 'letra' })
    expect(wrapper.find('[data-external-stub]').exists()).toBe(false)
    wrapper.unmount()
  })
  it.each(['external', 'invalid'] as const)('removes a %s score in content edit and supports undo', async kind => {
    const text = kind === 'external' ? reference : reference.replace('{x_titan_score:', '{x_titan_start_of_score:') + '\n{x_titan_end_of_score}'
    const wrapper = mount(TitanChordpro, {
      props: { source: `${original}\n${text}`, modes: 'content', theme: 'light', autoHide: false },
      attachTo: document.body,
      global: { stubs: { ExternalScore: { template: '<div data-external-stub />' } } },
    })
    try {
      await flushPromises()
      await wrapper.get('[data-edit]').trigger('click')
      await flushPromises()
      if (wrapper.find('[data-mode-content]').exists()) await wrapper.get('[data-mode-content]').trigger('click')
      await flushPromises()
      const card = wrapper.get(kind === 'external' ? '[data-external-stub]' : '[data-invalid-score]')
      const block = card.element.closest('[data-block]')!
      const bi = block.getAttribute('data-block')
      await wrapper.get(`[data-grip="${bi}"]`).trigger('keydown', { key: 'Enter' })
      await flushPromises()
      expect(wrapper.find('[data-edit-score]').exists()).toBe(false)
      expect(wrapper.find('[data-adjust-score]').exists()).toBe(kind === 'external')
      expect(wrapper.find('[aria-label="Editor de partitura"]').exists()).toBe(false)
      await wrapper.get(`[data-block="${bi}"] [data-remove-score]`).trigger('click')
      await flushPromises()
      expect(wrapper.find(kind === 'external' ? '[data-external-stub]' : '[data-invalid-score]').exists()).toBe(false)
      await wrapper.get('[data-source]').trigger('click')
      await flushPromises()
      const source = (wrapper.get('textarea[aria-label="Fonte ChordPro"]').element as HTMLTextAreaElement).value
      expect(source).toBe(original)
      await wrapper.get('button[aria-label="Fechar painel de source"]').trigger('click')
      await wrapper.get('[data-undo]').trigger('click')
      await flushPromises()
      expect(wrapper.find(kind === 'external' ? '[data-external-stub]' : '[data-invalid-score]').exists()).toBe(true)
    } finally { wrapper.unmount() }
  })
  it('duplicates, adjusts and moves a solo after a chorus, preserving the saved source', async () => {
    const source = `${reference}\n\n${original}`
    const wrapper = mount(TitanChordpro, {
      props: { source, modes: 'content', theme: 'light', autoHide: false },
      global: { stubs: { ExternalScore: { props: ['text'], template: '<div data-external-stub>{{ text }}</div>' } } },
    })
    const current = () => (wrapper.vm as unknown as { getSource(): string }).getSource()
    const select = async (bi: number) => {
      if (wrapper.find('[data-close-sel]').exists()) await wrapper.get('[data-close-sel]').trigger('click')
      await wrapper.get(`[data-grip="${bi}"]`).trigger('keydown', { key: 'Enter' })
      await flushPromises()
    }
    try {
      await flushPromises()
      await wrapper.get('[data-edit]').trigger('click')
      await flushPromises()
      if (wrapper.find('[data-mode-content]').exists()) await wrapper.get('[data-mode-content]').trigger('click')
      await select(0)
      await wrapper.get('[data-duplicate]').trigger('click')
      await flushPromises()
      await select(1)
      await wrapper.get('[data-adjust-score]').trigger('click')
      const updated = writeScoreReference({ src: '/solo.gp', track: 1, start: 3, end: 11 })
      wrapper.getComponent(ImportScoreDialog).vm.$emit('save', updated)
      await flushPromises()
      expect(current().split(reference)).toHaveLength(2)
      expect(current()).toContain(updated)
      // Move the copy one block at a time until it follows the first refrain.
      let bs = layoutChart(parse(current()))
      let bi = bs.findIndex(b => b.kind === 'score' && b.text === updated)
      await select(bi)
      for (let step = 0; step < 20; step++) {
        bs = layoutChart(parse(current()))
        bi = bs.findIndex(b => b.kind === 'score' && b.text === updated)
        if (bs[bi - 1]?.kind === 'chorus') break
        await wrapper.get('[data-nudge-down]').trigger('click')
        await flushPromises()
      }
      bs = layoutChart(parse(current()))
      bi = bs.findIndex(b => b.kind === 'score' && b.text === updated)
      expect(bs[bi - 1]?.kind).toBe('chorus')
      const moved = current()
      await wrapper.get('[data-save]').trigger('click')
      await flushPromises()
      expect(wrapper.emitted('save')?.at(-1)).toEqual([moved])
      await wrapper.setProps({ source: moved })
      expect(current()).toBe(moved)
      expect(moved.replace(`${reference}\n\n`, '').replace(`${updated}\n`, '').replace(/\n+/g, '\n').trim()).toBe(original.replace(/\n+/g, '\n').trim())
    } finally { wrapper.unmount() }
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
      await vi.waitFor(() => expect(wrapper.find('button[aria-label="Faixa"]').exists()).toBe(true))
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
