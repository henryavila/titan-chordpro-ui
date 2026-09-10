import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

/**
 * Tela cheia used to flip `zen` on a phone, which hid Rolar / Tom / Mais the
 * moment a musician asked for the screen — the one time they most need them.
 */

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
let restoreFs: (() => void) | null = null

function installFullscreen() {
  let current: Element | null = null
  const proto = Element.prototype as Element & { requestFullscreen?: () => Promise<void> }
  const prevReq = proto.requestFullscreen
  proto.requestFullscreen = function () {
    current = this
    document.dispatchEvent(new Event('fullscreenchange'))
    return Promise.resolve()
  }
  const prevEnabled = Object.getOwnPropertyDescriptor(Document.prototype, 'fullscreenEnabled')
  const prevEl = Object.getOwnPropertyDescriptor(Document.prototype, 'fullscreenElement')
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => true })
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => current })
  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true,
    writable: true,
    value: () => {
      current = null
      document.dispatchEvent(new Event('fullscreenchange'))
      return Promise.resolve()
    },
  })
  return () => {
    if (prevReq) proto.requestFullscreen = prevReq
    else delete (proto as { requestFullscreen?: unknown }).requestFullscreen
    if (prevEnabled) Object.defineProperty(Document.prototype, 'fullscreenEnabled', prevEnabled)
    else Reflect.deleteProperty(document, 'fullscreenEnabled')
    if (prevEl) Object.defineProperty(Document.prototype, 'fullscreenElement', prevEl)
    else Reflect.deleteProperty(document, 'fullscreenElement')
    Reflect.deleteProperty(document, 'exitFullscreen')
  }
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('cpv:fitSeen', '1')
  observers.length = 0
  realRO = globalThis.ResizeObserver
  globalThis.ResizeObserver = TestRO as unknown as typeof ResizeObserver
  restoreFs = installFullscreen()
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  globalThis.ResizeObserver = realRO
  restoreFs?.()
  restoreFs = null
  localStorage.clear()
})

async function phoneViewer() {
  const w = mount(ChordproViewer, {
    props: { source: loadFixture(JESUS_1), theme: 'dark', autoHide: false, songId: 'jesus-1' },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width: 390, height: 800 } }]))
  await flushPromises()
  return w
}

function chromeHidden(w: Awaited<ReturnType<typeof phoneViewer>>) {
  return w.findAll('.cpv-chrome').map((c) => c.classes().includes('is-hidden'))
}

describe('Tela cheia on a phone keeps the live controls', () => {
  it('does not hide the dock or the header when entering tela cheia', async () => {
    const w = await phoneViewer()
    expect(w.find('[data-fs]').exists()).toBe(true)
    expect(chromeHidden(w).some(Boolean)).toBe(false)

    await w.get('[data-fs]').trigger('click')
    await flushPromises()

    expect(chromeHidden(w).some(Boolean), 'tela cheia hid a chrome surface').toBe(false)
    expect(w.find('.cpv-chrome-hint').exists()).toBe(false)
    expect(w.get('[data-fs]').attributes('aria-label')).toBe('Sair da tela cheia')
    expect(w.find('[data-scroll]').exists()).toBe(true)
    expect(w.find('[aria-label="Mais controles"]').exists()).toBe(true)
    expect(w.find('[data-tone]').exists()).toBe(true)
  })

  it('a tap still hides the chrome on demand, without leaving tela cheia', async () => {
    const w = await phoneViewer()
    await w.get('[data-fs]').trigger('click')
    await flushPromises()

    await w.get('[data-cpv-scroll]').trigger('click')
    await flushPromises()
    expect(chromeHidden(w).every(Boolean)).toBe(true)
    expect(w.get('[data-fs]').attributes('aria-label')).toBe('Sair da tela cheia')
    expect(w.text()).toContain('Toque na cifra para mostrar os controles')

    await w.get('[data-cpv-scroll]').trigger('click')
    await flushPromises()
    expect(chromeHidden(w).some(Boolean)).toBe(false)
    expect(w.get('[data-fs]').attributes('aria-label')).toBe('Sair da tela cheia')
  })

  it('leaving tela cheia does not hide the chrome', async () => {
    const w = await phoneViewer()
    await w.get('[data-fs]').trigger('click')
    await flushPromises()
    await w.get('[data-fs]').trigger('click')
    await flushPromises()

    expect(chromeHidden(w).some(Boolean)).toBe(false)
    expect(w.get('[data-fs]').attributes('aria-label')).toBe('Tela cheia')
    expect(w.find('[data-scroll]').exists()).toBe(true)
  })

  it('a wide screen already kept the chrome — entering tela cheia still does', async () => {
    const w = mount(ChordproViewer, {
      props: { source: loadFixture(JESUS_1), theme: 'dark', autoHide: false, songId: 'jesus-1' },
      attachTo: document.body,
    })
    mounted.push(w)
    await flushPromises()
    observers.forEach((cb) => cb([{ contentRect: { width: 1100, height: 800 } }]))
    await flushPromises()

    // The wide bar has no `data-fs`: that mark is on the phone dock / header.
    await w.get('[aria-label="Tela cheia"]').trigger('click')
    await flushPromises()
    expect(chromeHidden(w).some(Boolean)).toBe(false)
    expect(w.get('[aria-label="Sair da tela cheia"]').exists()).toBe(true)
  })
})
