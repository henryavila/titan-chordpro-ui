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
  Reflect.deleteProperty(window, 'visualViewport')
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

async function viewerAt(size: { w: number; h: number }) {
  const w = mount(ChordproViewer, {
    props: { source: loadFixture(JESUS_1), theme: 'dark', autoHide: false, songId: 'jesus-1' },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width: size.w, height: size.h } }]))
  await flushPromises()
  return w
}

function rect(top: number, left: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    top,
    left,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect
}

function stubView(el: HTMLElement, box: { top: number; left: number; w: number; h: number }, view: { w: number; h: number }) {
  el.getBoundingClientRect = () => rect(box.top, box.left, box.w, box.h)
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: view.w })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: view.h })
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: {
      width: view.w,
      height: view.h,
      offsetLeft: 0,
      offsetTop: 0,
      addEventListener() {},
      removeEventListener() {},
    },
  })
  document.dispatchEvent(new Event('scroll'))
}

/** Parked ficha / standalone: the root already paints the visual viewport. */
function coverViewport(
  w: Awaited<ReturnType<typeof viewerAt>>,
  view: { w: number; h: number },
) {
  stubView(w.get('[data-cpv-root]').element as HTMLElement, { top: 0, left: 0, w: view.w, h: view.h }, view)
}

/** Ficha still showing host chrome above the chart. */
function hostChromeAbove(
  w: Awaited<ReturnType<typeof viewerAt>>,
  view: { w: number; h: number },
  gap = 180,
) {
  stubView(w.get('[data-cpv-root]').element as HTMLElement, { top: gap, left: 0, w: view.w, h: view.h }, view)
}

const FS_LABELS = ['Tela cheia', 'Sair da tela cheia', 'Modo imersivo', 'Sair do modo imersivo']

function fsControls(w: Awaited<ReturnType<typeof viewerAt>>) {
  const seen = new Set<Element>()
  return [...w.findAll('[data-fs]'), ...w.findAll('button')].filter((b) => {
    if (b.element.closest('[data-cpv-zen-title]')) return false
    const hit = b.attributes('data-fs') !== undefined || FS_LABELS.includes(b.attributes('aria-label') ?? '')
    if (!hit || seen.has(b.element)) return false
    seen.add(b.element)
    return true
  })
}

function fsChromeSide(w: Awaited<ReturnType<typeof viewerAt>>): 'top' | 'bottom' | 'none' {
  const btns = fsControls(w)
  if (!btns.length) return 'none'
  const chrome = btns[0]!.element.closest('.cpv-chrome') as HTMLElement | null
  const s = chrome?.getAttribute('style') ?? ''
  if (/(?:^|;)\s*top:\s*0/.test(s)) return 'top'
  if (/(?:^|;)\s*bottom:\s*0/.test(s)) return 'bottom'
  return 'none'
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
    expect(w.find('.cpv-chrome-hint').exists()).toBe(false)
    expect(w.get('.cpv-toast').text()).toBe('Toque na tela para mostrar os controles')

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

    await w.get('[aria-label="Tela cheia"]').trigger('click')
    await flushPromises()
    expect(chromeHidden(w).some(Boolean)).toBe(false)
    expect(w.find('[aria-label="Sair da tela cheia"]').exists()).toBe(true)
  })
})

/**
 * Parking a ficha (scroll-snap) or rotating to a wide layout used to send
 * Tela cheia from the header to the dock / bottom bar. The control stays in
 * the top chrome on every width, parked or not.
 */
describe('Tela cheia stays in the top chrome', () => {
  it('stays in the header after the ficha parks and pinning would win nothing', async () => {
    const view = { w: 390, h: 844 }
    const w = await viewerAt(view)
    coverViewport(w, view)
    await flushPromises()

    expect(fsControls(w).length, 'one Tela cheia, not one in the header and one in the dock').toBe(1)
    expect(fsChromeSide(w)).toBe('top')
    expect(w.get('[data-fs]').attributes('aria-label')).toBe('Tela cheia')
  })

  it('is already in the header while the ficha still shows host chrome above', async () => {
    const view = { w: 390, h: 844 }
    const w = await viewerAt(view)
    hostChromeAbove(w, view)
    await flushPromises()

    expect(fsControls(w).length).toBe(1)
    expect(fsChromeSide(w)).toBe('top')
  })

  it('sits in the top bar on a desktop, not in the dock that has the space', async () => {
    const view = { w: 1280, h: 800 }
    const w = await viewerAt(view)
    coverViewport(w, view)
    await flushPromises()

    expect(fsControls(w).length).toBe(1)
    expect(fsChromeSide(w)).toBe('top')
  })

  it('stays in the top bar when a phone rotates into a wide landscape', async () => {
    const portrait = { w: 390, h: 844 }
    const w = await viewerAt(portrait)
    hostChromeAbove(w, portrait)
    await flushPromises()
    expect(fsChromeSide(w)).toBe('top')

    const landscape = { w: 844, h: 390 }
    observers.forEach((cb) => cb([{ contentRect: { width: landscape.w, height: landscape.h } }]))
    coverViewport(w, landscape)
    await flushPromises()

    expect(fsControls(w).length).toBe(1)
    expect(fsChromeSide(w)).toBe('top')
  })

  it('stays in the header through enter and leave', async () => {
    const view = { w: 390, h: 844 }
    const w = await viewerAt(view)
    coverViewport(w, view)
    await flushPromises()

    await w.get('[data-fs]').trigger('click')
    await flushPromises()
    expect(fsChromeSide(w)).toBe('top')
    expect(w.get('[data-fs]').attributes('aria-label')).toBe('Sair da tela cheia')

    await w.get('[data-fs]').trigger('click')
    await flushPromises()
    expect(fsChromeSide(w)).toBe('top')
    expect(w.get('[data-fs]').attributes('aria-label')).toBe('Tela cheia')
  })

  it('stays off when there is no screen to win — parked iPhone Safari', async () => {
    restoreFs?.()
    restoreFs = null
    const view = { w: 390, h: 844 }
    const w = await viewerAt(view)
    coverViewport(w, view)
    await flushPromises()

    expect(fsControls(w).length).toBe(0)
    expect(fsChromeSide(w)).toBe('none')
  })
})
