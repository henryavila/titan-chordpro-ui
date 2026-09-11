import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { loadFixture } from '../helpers/load-fixture'

const sljaCalls: Array<Record<string, unknown> | undefined> = []
vi.mock('@henryavila/titan-chordpro-ui/slides', () => ({
  renderSlja: (_view: unknown, opts?: Record<string, unknown>) => {
    sljaCalls.push(opts)
    return Promise.resolve(new Uint8Array([80, 75, 3, 4]))
  },
}))

function mountViewer(props: Record<string, unknown> = {}) {
  return mount(ChordproViewer, {
    props: {
      source: loadFixture('sda/101-fala-comigo.cho'),
      theme: 'dark',
      autoHide: false,
      songId: 'fala',
      ...props,
    },
    attachTo: document.body,
  })
}

beforeEach(() => {
  localStorage.clear()
  sljaCalls.length = 0
  URL.createObjectURL = vi.fn(() => 'blob:slides') as typeof URL.createObjectURL
  URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL
})
afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('export slides', () => {
  it('offers .slja next to CHO and PDF', async () => {
    const w = mountViewer()
    await flushPromises()
    await w.get('[aria-label="Exportar"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-export="slides"]').text()).toMatch(/Slide Louvor JA/)
    w.unmount()
  })

  it('passes host cover and slides images through to the writer', async () => {
    const cover = new Uint8Array([1, 2, 3])
    const slidesImg = new Uint8Array([4, 5, 6])
    const w = mountViewer({ coverImage: cover, slidesImage: slidesImg })
    await flushPromises()
    await w.get('[aria-label="Exportar"]').trigger('click')
    await flushPromises()
    await w.get('[data-export="slides"]').trigger('click')
    await flushPromises()
    expect(sljaCalls.at(-1)).toMatchObject({
      title: expect.stringMatching(/Fala Comigo/i),
      coverImage: cover,
      slidesImage: slidesImg,
    })
    w.unmount()
  })

  it('shows an error banner when generation fails', async () => {
    const w = mountViewer({ slidesShouldFail: true })
    await flushPromises()
    await w.get('[aria-label="Exportar"]').trigger('click')
    await flushPromises()
    await w.get('[data-export="slides"]').trigger('click')
    await flushPromises()
    expect(w.text()).toMatch(/slides falhou/)
    w.unmount()
  })
})
