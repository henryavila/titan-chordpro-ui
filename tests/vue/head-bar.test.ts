import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import { memoryStore } from '../../src/core'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

/**
 * The identity bar used to give every leftover pixel to tom/capo/fullscreen.
 * With a rehearsal list AND capo on, the title collapsed to an ellipsis
 * ("O…") because the name cluster was `min-width: 0` and the wide bar was
 * capped at the reading column (`pageMax`), even when the frame was wider.
 */

const O_REI = loadFixture('sda/082-o-rei-vem-vindo.cho')
const JESUS = loadFixture(JESUS_1)

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
    Reflect.deleteProperty(document, 'fullscreenEnabled')
    Reflect.deleteProperty(document, 'fullscreenElement')
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

const rehearsal = [
  { id: 'o-rei', title: '082 - O Rei vem vindo', source: O_REI },
  { id: 'jesus', title: 'Jesus, Tu És a minha vida', source: JESUS },
]

async function viewerAt(width: number) {
  const w = mount(ChordproViewer, {
    props: {
      source: '',
      songs: rehearsal,
      theme: 'dark',
      autoHide: false,
      storage: memoryStore(),
    },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width, height: 800 } }]))
  await flushPromises()
  return w
}

function head(w: Awaited<ReturnType<typeof viewerAt>>) {
  return w.get('[data-cpv-head]').element as HTMLElement
}

function titleEl(w: Awaited<ReturnType<typeof viewerAt>>) {
  return w.get('[data-chart-title]').element as HTMLElement
}

function minWidthPx(el: HTMLElement) {
  const raw = getComputedStyle(el).minWidth
  if (raw.endsWith('px')) return parseFloat(raw)
  if (raw.endsWith('rem')) return parseFloat(raw) * 16
  if (raw.endsWith('ch')) return parseFloat(raw) * 8
  if (raw.endsWith('em')) return parseFloat(raw) * 16
  return Number.NaN
}

describe('the identity bar keeps the song name when capo joins the list', () => {
  it('adopts the capo written in the chart, so the pill really says capo', async () => {
    const w = await viewerAt(390)
    expect(w.get('[data-tone]').text()).toMatch(/capo\s*1/i)
  })

  it('on a phone, the title cluster cannot shrink to nothing', async () => {
    const w = await viewerAt(390)
    expect(w.get('[data-setlist-open]').text()).toMatch(/1\/2/)
    expect(titleEl(w).textContent).toContain('O Rei vem vindo')
    const name = titleEl(w).parentElement as HTMLElement
    expect(minWidthPx(name), `min-width was ${getComputedStyle(name).minWidth}`).toBeGreaterThanOrEqual(160)
  })

  it('on a phone, the bar wraps instead of clipping the name under capo + tela cheia', async () => {
    const w = await viewerAt(390)
    const el = head(w)
    expect(getComputedStyle(el).flexWrap).toBe('wrap')
    expect(getComputedStyle(el).justifyContent).toBe('space-between')
    expect(getComputedStyle(el).height).not.toBe('40px')
  })

  it('keeps the tom control compact on a phone', async () => {
    const w = await viewerAt(390)
    const tone = w.get('[data-tone]').element as HTMLElement
    expect(tone.getBoundingClientRect().height).toBeLessThanOrEqual(30)
  })

  it('drops the list glyph from the title — the whole title opens the list', async () => {
    const w = await viewerAt(390)
    expect(w.find('[data-cpv-head] [data-icon=listMusic]').exists()).toBe(false)
    expect(w.get('[data-setlist-open]').attributes('title')).toMatch(/lista/i)
  })

  it('keeps Tela cheia as the last head control so space-between pins it right', async () => {
    const w = await viewerAt(390)
    const kids = [...head(w).children] as HTMLElement[]
    expect(kids.at(-1)?.hasAttribute('data-fs')).toBe(true)
  })

  it('on a tablet column, the floating head may grow past the reading column', async () => {
    // md: pageMax is 760px; the frame here is 800px. Capo + 1/n used to eat
    // the title because the pill could not use the leftover 40px (nor wrap).
    const w = await viewerAt(800)
    const el = head(w)
    expect(el.classList.contains('is-wide')).toBe(true)
    expect(getComputedStyle(el).maxWidth).toBe('100%')
    expect(getComputedStyle(el).width).toBe('max-content')
    expect(parseFloat(getComputedStyle(el).borderRadius)).toBeGreaterThan(0)
    expect(getComputedStyle(el).justifyContent).toBe('space-between')
    expect(titleEl(w).textContent).toContain('O Rei vem vindo')
    const name = titleEl(w).parentElement as HTMLElement
    expect(minWidthPx(name)).toBeGreaterThanOrEqual(160)
    expect(w.find('[data-cpv-head] [data-icon=listMusic]').exists()).toBe(false)
  })

  it('keeps the phone head as a floating card with an inset above it', async () => {
    const w = await viewerAt(390)
    const el = head(w)
    const wrap = el.parentElement as HTMLElement
    expect(parseFloat(getComputedStyle(wrap).paddingTop)).toBeGreaterThan(0)
    expect(parseFloat(getComputedStyle(el).borderRadius)).toBeGreaterThan(0)
  })

  it('without a list the title still has a floor, so a long capo pill cannot eat it', async () => {
    const w = mount(ChordproViewer, {
      props: { source: O_REI, theme: 'dark', autoHide: false, storage: memoryStore() },
      attachTo: document.body,
    })
    mounted.push(w)
    await flushPromises()
    observers.forEach((cb) => cb([{ contentRect: { width: 390, height: 800 } }]))
    await flushPromises()
    expect(w.get('[data-tone]').text()).toMatch(/capo/i)
    const name = titleEl(w).parentElement as HTMLElement
    expect(minWidthPx(name)).toBeGreaterThanOrEqual(160)
  })
})
