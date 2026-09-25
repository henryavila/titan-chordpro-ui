import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { STORE_KEYS, memoryStore, type ChartStore } from '../../src/core/index'

const SRC = `{title: Teste}
{key: C}
{duration: 2:00}
[C]casa [Am]lar
`

const MISS = `{title: Teste}
{key: C}
[C7+]
la
`

/** A ukulele shape high on the neck. Stretched to the guitar width, it used to scroll. */
const TALL_UKE = `{title: Teste}
{key: C}
{define-ukulele: C frets 12 14 14 12}
[C] la
`

const mounted: ReturnType<typeof mount>[] = []
const observers: ((entries: unknown[]) => void)[] = []
class TestRO {
  constructor(cb: (entries: unknown[]) => void) {
    observers.push(cb)
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
let realRO: typeof ResizeObserver

beforeEach(() => {
  observers.length = 0
  realRO = globalThis.ResizeObserver
  globalThis.ResizeObserver = TestRO as unknown as typeof ResizeObserver
})

afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  globalThis.ResizeObserver = realRO
})

function mountViewer(props: Record<string, unknown> = {}, store: ChartStore = memoryStore()) {
  const w = mount(ChordproViewer, {
    props: { source: SRC, theme: 'dark', autoHide: false, storage: store, ...props },
    attachTo: document.body,
  })
  mounted.push(w)
  return { w, store }
}

describe('diagram modal', () => {
  it('opens the guitar shape on tap and does not change the chart height', async () => {
    const { w } = mountViewer()
    await flushPromises()
    const scroller = w.get('[data-cpv-scroll]').element as HTMLElement
    const before = scroller.scrollHeight
    expect(w.find('[data-diagram-modal]').exists()).toBe(false)
    await w.get('[data-diagram-hit]').trigger('click')
    await flushPromises()
    expect(w.get('[data-diagram-name]').text()).toBe('C')
    expect(w.get('[data-diagram-instrument="guitar"]').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-diagram-draw]').html()).toContain('diagram-dot')
    expect(w.get('[data-diagram-draw]').html()).toContain('currentColor')
    expect(w.get('[data-diagram-draw]').html()).not.toContain('fill="#111"')
    expect(scroller.scrollHeight).toBe(before)
  })

  it('switches instrument in place and keeps it on the next chart', async () => {
    const store = memoryStore()
    const { w } = mountViewer({}, store)
    await flushPromises()
    await w.get('[data-diagram-hit]').trigger('click')
    await w.get('[data-diagram-instrument="piano"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-diagram-draw]').html()).toContain('diagram-piano-white')
    expect(w.get('[data-diagram-draw]').attributes('data-diagram-kind')).toBe('piano')
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent ?? '').join('\n')
    const pianoRule = css.split('}').find((block) => block.includes('data-diagram-kind') && block.includes('piano'))
    expect(pianoRule).toBeTruthy()
    expect(pianoRule).toContain('32rem')
    expect(pianoRule).not.toMatch(/width:\s*100%/)
    const close = w.get('[data-diagram-close]')
    expect(close.attributes('aria-label')).toBe('Fechar')
    expect(close.text().replace(/\s/g, '')).toBe('')
    expect(close.find('[data-icon="x"]').exists()).toBe(true)
    const saved = JSON.parse(store.get(STORE_KEYS.prefs) ?? '{}') as { diagramInstrument?: string }
    expect(saved.diagramInstrument).toBe('piano')

    w.unmount()
    const again = mountViewer({ source: SRC.replace('[C]', '[G]') }, store)
    await flushPromises()
    await again.w.get('[data-diagram-hit]').trigger('click')
    await flushPromises()
    expect(again.w.get('[data-diagram-instrument="piano"]').attributes('aria-pressed')).toBe('true')
    expect(again.w.get('[data-diagram-name]').text()).toBe('G')
  })

  it('never scrolls the diagram, including a tall ukulele shape', async () => {
    const { w } = mountViewer({ source: TALL_UKE })
    await flushPromises()
    await w.get('[data-diagram-hit]').trigger('click')
    await w.get('[data-diagram-instrument="ukulele"]').trigger('click')
    await flushPromises()
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent ?? '').join('\n')
    const stageRule = css.split('}').find((block) => block.includes('cpv-diagram-stage'))
    expect(stageRule).toBeTruthy()
    expect(stageRule).toContain('overflow: hidden')
    expect(stageRule).not.toMatch(/overflow(-[xy])?:\s*(auto|scroll)/)
    const svgRule = css.split('}').find((block) => block.includes('cpv-diagram-draw') && block.includes('svg'))
    expect(svgRule).toBeTruthy()
    expect(svgRule).toContain('max-height: 100%')
    expect(svgRule).toContain('max-width: 100%')
    expect(svgRule).toContain('width: 100%')
    expect(svgRule).toContain('height: 100%')
    for (const sel of ['[data-diagram-modal]', '[data-diagram-stage]', '[data-diagram-draw]']) {
      const el = w.get(sel).element as HTMLElement
      const overflow = `${getComputedStyle(el).overflow} ${getComputedStyle(el).overflowY}`
      expect(overflow).not.toMatch(/auto|scroll/)
      if (el.clientHeight > 0) expect(el.scrollHeight).toBeLessThanOrEqual(el.clientHeight + 1)
    }
    expect(w.get('[data-diagram-draw] svg').attributes('width')).not.toBe('100%')
  })

  function pointer(type: string, x: number, y: number, target: EventTarget = window) {
    target.dispatchEvent(
      new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, button: 0, cancelable: true }),
    )
  }

  it('follows a downward drag and closes only past the threshold', async () => {
    const { w } = mountViewer()
    await flushPromises()
    await w.get('[data-diagram-hit]').trigger('click')
    await flushPromises()
    expect(w.get('[data-diagram-grab] [data-icon="chevronDown"]').exists()).toBe(true)
    const panel = w.get('[data-diagram-panel]').element

    pointer('pointerdown', 40, 80, panel)
    pointer('pointermove', 40, 120)
    pointer('pointerup', 40, 120)
    await flushPromises()
    expect(w.find('[data-diagram-modal]').exists()).toBe(true)
    expect((panel as HTMLElement).style.transform).toBe('')

    pointer('pointerdown', 40, 80, panel)
    pointer('pointermove', 40, 104)
    await flushPromises()
    const earlyBlur = Number((w.get('[data-diagram-modal]').attributes('style') ?? '').match(/--diagram-blur:\s*([\d.]+)px/)?.[1])
    expect(earlyBlur).toBeGreaterThan(10)
    pointer('pointermove', 40, 176)
    await flushPromises()
    const atRelease = Number((w.get('[data-diagram-modal]').attributes('style') ?? '').match(/--diagram-blur:\s*([\d.]+)px/)?.[1])
    expect(atRelease).toBe(0)
    pointer('pointermove', 48, 280)
    await flushPromises()
    expect((panel as HTMLElement).style.transform).toBe('translate3d(0, 200px, 0)')
    expect(Number((w.get('[data-diagram-modal]').attributes('style') ?? '').match(/--diagram-blur:\s*([\d.]+)px/)?.[1])).toBe(0)
    const scrim = getComputedStyle(w.get('[data-diagram-scrim]').element).opacity
    expect(Number(scrim)).toBeLessThan(1)
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent ?? '').join('\n')
    expect(css).toContain('backdrop-filter: blur(var(--diagram-blur')
    expect(css).toContain('-webkit-backdrop-filter: blur(var(--diagram-blur')
    pointer('pointerup', 48, 280)
    await new Promise((resolve) => setTimeout(resolve, 280))
    expect(w.find('[data-diagram-modal]').exists()).toBe(false)
  })

  it('says when the instrument has no shape', async () => {
    const { w } = mountViewer({ source: MISS })
    await flushPromises()
    await w.get('[data-diagram-hit]').trigger('click')
    await flushPromises()
    expect(w.get('[data-diagram-miss]').text()).toBe('Sem forma neste instrumento')
    expect(w.find('[data-diagram-instrument="ukulele"]').exists()).toBe(true)
  })

  it('does not open from só letra or when diagrams are off', async () => {
    const letra = mountViewer({ lens: 'letra' })
    await flushPromises()
    expect(letra.w.find('[data-diagram-hit]').exists()).toBe(false)

    const off = mountViewer({ capabilities: { diagrams: false } })
    await flushPromises()
    expect(off.w.find('[data-diagram-hit]').exists()).toBe(false)
    expect(off.w.find('[data-diagram-modal]').exists()).toBe(false)
  })

  it('shows the playable name, not the Nashville degree', async () => {
    const { w } = mountViewer({ lens: 'nashville' })
    await flushPromises()
    const hit = w.get('[data-diagram-hit]')
    expect(hit.text()).not.toBe(hit.attributes('data-shape'))
    await hit.trigger('click')
    await flushPromises()
    expect(w.get('[data-diagram-name]').text()).toBe(hit.attributes('data-shape'))
    expect(w.get('[data-diagram-name]').text()).toMatch(/^[A-G]/)
  })

  async function roomy(w: ReturnType<typeof mountViewer>['w']) {
    const el = w.get('[data-cpv-scroll]').element as HTMLElement
    Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => 2400 })
    Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => 400 })
    observers.forEach((cb) => cb([{ contentRect: { width: 900, height: 800 } }]))
    await flushPromises()
    return el
  }

  it('pauses Rolar while the shape is open and resumes it', async () => {
    const { w } = mountViewer()
    const el = await roomy(w)
    const before = el.scrollHeight
    await w.get('[title="Metrônomo (M)"]').trigger('click')
    await flushPromises()
    await w.get('[data-met-follow]').trigger('click')
    await flushPromises()
    await w.get('[title="Metrônomo (M)"]').trigger('click')
    await flushPromises()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    expect(w.get('[data-scroll]').text()).toMatch(/Parar/)
    await w.get('[data-diagram-hit]').trigger('click')
    await flushPromises()
    expect(el.scrollHeight).toBe(before)
    expect(w.get('[data-scroll]').text()).toMatch(/Rolar/)
    await w.get('[data-diagram-close]').trigger('click')
    await flushPromises()
    expect(w.get('[data-scroll]').text()).toMatch(/Parar/)
  })

  it('pauses the metronome while the shape is open and resumes it', async () => {
    const { w } = mountViewer()
    await roomy(w)
    await w.get('[title="Metrônomo (M)"]').trigger('click')
    await flushPromises()
    const start = w.findAll('button').find((b) => /Iniciar/.test(b.text()))
    expect(start).toBeTruthy()
    await start!.trigger('click')
    await flushPromises()
    expect(w.get('[title="Metrônomo (M)"]').text()).toMatch(/BPM/)
    await w.get('[data-diagram-hit]').trigger('click')
    await flushPromises()
    expect(w.get('[title="Metrônomo (M)"]').text()).not.toMatch(/BPM/)
    await w.get('[data-diagram-close]').trigger('click')
    await flushPromises()
    expect(w.get('[title="Metrônomo (M)"]').text()).toMatch(/BPM/)
  })
})
