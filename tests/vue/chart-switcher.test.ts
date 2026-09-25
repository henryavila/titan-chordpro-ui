import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

/** Same N>1 file as `TWO_CHART_SOURCE` in tests/core/charts-envelope.test.ts. */
const TWO_CHART_SOURCE = `{start_of_x_chart:completa}
{title:Uma}
{artist:Alguém}
{x_chart_label:Completa}
{key:G}
{duration:04:26}
[G]corpo da completa
{end_of_x_chart}

{start_of_x_chart:oferta}
{title:Uma}
{artist:Alguém}
{x_chart_label:Oferta}
{x_chart_default:oferta}
{key:C}
{duration:02:00}
[C]corpo da oferta
{end_of_x_chart}
`

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

async function mountViewer(props: Record<string, unknown> = {}) {
  const w = mount(ChordproViewer, {
    props: {
      source: TWO_CHART_SOURCE,
      theme: 'dark',
      autoHide: false,
      songId: 'uma',
      ...props,
    },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width: 800, height: 800 } }]))
  await flushPromises()
  return w
}

async function pickChart(w: Awaited<ReturnType<typeof mountViewer>>, id: string) {
  await w.get('[data-chart-switch]').trigger('click')
  await flushPromises()
  await w.get(`[data-chart-option="${id}"]`).trigger('click')
  await flushPromises()
}

describe('title chip and chartId prop', () => {
  it('shows a cifra chip with the default chart label', async () => {
    const w = await mountViewer()
    const chip = w.get('[data-chart-switch]')
    expect(chip.exists()).toBe(true)
    expect(chip.text()).toMatch(/Cifra/i)
    expect(chip.text()).toMatch(/Oferta/)
    expect(chip.text()).not.toMatch(/Completa/)
    expect(chip.text()).not.toMatch(/versão/i)
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da oferta')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da completa')
  })

  it('selecting Completa emits update:chartId and re-parses that chart only', async () => {
    const w = await mountViewer()
    await pickChart(w, 'completa')
    expect(w.emitted('update:chartId')?.flat()).toContain('completa')
    expect(w.get('[data-chart-switch]').text()).toMatch(/Completa/)
    expect(w.get('[data-chart-switch]').text()).not.toMatch(/Oferta/)
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
  })

  it('opens on the chartId prop', async () => {
    const w = await mountViewer({ chartId: 'completa' })
    expect(w.get('[data-chart-switch]').text()).toMatch(/Completa/)
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
  })

  it('hides the control on a one-chart file', async () => {
    const w = await mountViewer({ source: loadFixture(JESUS_1) })
    expect(w.find('[data-chart-switch]').exists()).toBe(false)
  })

  it('uses cpv-head-chip invert class and does not steal the Tom chip', async () => {
    const w = await mountViewer()
    const chip = w.get('[data-chart-switch]')
    expect(chip.classes()).toContain('cpv-head-chip')
    expect(w.get('.cpv-keypill').classes()).toContain('cpv-head-chip')
    expect(w.get('.cpv-keypill').text()).toMatch(/Tom/i)
    expect(chip.text()).not.toMatch(/Tom/i)
  })
})
