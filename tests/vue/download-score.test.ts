import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { writeScoreReference } from '../../src/core'
import { downloadScoreFile } from '../../src/vue/chart/download-score'
import ExternalScore from '../../src/vue/chart/ExternalScore.vue'

describe('downloadScoreFile', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('saves the original bytes under the Titan block name', async () => {
    const realCreate = document.createElement.bind(document)
    const anchors: HTMLAnchorElement[] = []
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
      const el = realCreate(tag, options)
      if (tag === 'a') {
        el.click = vi.fn()
        anchors.push(el as HTMLAnchorElement)
      }
      return el
    })
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => 'blob:score')
      static revokeObjectURL = vi.fn()
    })
    const name = await downloadScoreFile({
      text: writeScoreReference({ src: 'solos/uuid.gp', track: 1, start: 1, name: 'Solo de entrada' }),
      bytes: new Uint8Array([1, 2, 3]),
    })
    expect(name).toBe('Solo de entrada.gp')
    expect(anchors[0]?.download).toBe('Solo de entrada.gp')
    expect(anchors[0]?.click).toHaveBeenCalled()
  })

  it('fetches the file when the bytes were not cached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/vnd.recordare.musicxml+xml' },
      arrayBuffer: async () => new Uint8Array([9, 8, 7]).buffer,
    }))
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
      const el = realCreate(tag, options)
      if (tag === 'a') el.click = vi.fn()
      return el
    })
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => 'blob:score')
      static revokeObjectURL = vi.fn()
    })
    const name = await downloadScoreFile({
      text: writeScoreReference({ src: 'solos/ponte', track: 1, start: 1, name: 'Ponte' }),
      resolveScore: src => `https://files.test/${src}`,
    })
    expect(name).toBe('Ponte.musicxml')
    expect(fetch).toHaveBeenCalledWith('https://files.test/solos/ponte')
  })
})

describe('Baixar on the score block', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
  it('shows a download control labelled with the Titan block name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const wrapper = mount(ExternalScore, {
      props: {
        text: writeScoreReference({ src: '/solos/x.gp', track: 1, start: 1, name: 'Intro da guitarra' }),
        blockGap: '0',
      },
    })
    try {
      await flushPromises()
      await wrapper.get('button[aria-label="Opções de Intro da guitarra"]').trigger('click')
      await flushPromises()
      const button = document.body.querySelector('button[aria-label="Baixar Intro da guitarra"]')
      expect(button?.textContent).toContain('Baixar Intro da guitarra')
    } finally { wrapper.unmount() }
  })
})
