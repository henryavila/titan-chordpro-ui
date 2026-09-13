import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import { memoryStore } from '../../src/core'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

/**
 * Zen used to keep a full card replica in the page. Overscroll showed two
 * bars. Now the overlay card fades and a plain song name stays in the same
 * top band — no veil, no controls.
 */

const src = loadFixture(JESUS_1)
const TITLE = 'Jesus, Tu És a minha vida'

const observers: ((entries: unknown[]) => void)[] = []
class TestRO {
  constructor(cb: (entries: unknown[]) => void) {
    observers.push(cb)
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

const mounted: ReturnType<typeof mount>[] = []
let realRO: typeof ResizeObserver

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('cpv:fitSeen', '1')
  observers.length = 0
  realRO = globalThis.ResizeObserver
  globalThis.ResizeObserver = TestRO as unknown as typeof ResizeObserver
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  globalThis.ResizeObserver = realRO
  localStorage.clear()
})

async function viewerAt(width: number) {
  const w = mount(ChordproViewer, {
    props: { source: src, theme: 'dark', autoHide: false, storage: memoryStore() },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width, height: 800 } }]))
  await flushPromises()
  return w
}

function opacityOf(el: Element) {
  return getComputedStyle(el).opacity
}

describe('zen keeps a plain song name in the head band', () => {
  it.each([
    [390, 'phone'],
    [900, 'desktop'],
  ] as const)('on a %s, with chrome up there is no second title bar', async (width, _label) => {
    const w = await viewerAt(width)
    expect(w.find('[data-cpv-zen-title]').exists()).toBe(false)
    expect(w.findAll('[data-cpv-head]')).toHaveLength(1)
    expect(w.get('[data-chart-title]').text()).toContain(TITLE)
    const page = w.get('.cpv-page').element as HTMLElement
    expect(parseFloat(getComputedStyle(page).paddingTop), 'lyric sat under the overlay pad').toBeGreaterThan(40)
  })

  it.each([
    [390, 'phone'],
    [900, 'desktop'],
  ] as const)('on a %s, zen fades the card and pins only the name', async (width, _label) => {
    const w = await viewerAt(width)
    await w.get('[data-cpv-scroll]').trigger('click')
    await flushPromises()

    const overlay = w.get('[data-cpv-head]').element.closest('.cpv-chrome') as HTMLElement
    expect(overlay.classList.contains('is-hidden')).toBe(true)
    expect(opacityOf(overlay)).toBe('0')
    expect(w.get('[data-scroll]').element.closest('.cpv-chrome')!.classList.contains('is-hidden')).toBe(true)

    const zen = w.get('[data-cpv-zen-title]')
    expect(zen.text()).toContain(TITLE)
    expect(zen.find('.cpv-veil').exists()).toBe(false)
    expect(zen.find('button').exists()).toBe(false)
    expect(getComputedStyle(zen.element).position).toMatch(/absolute|fixed/)
  })
})
