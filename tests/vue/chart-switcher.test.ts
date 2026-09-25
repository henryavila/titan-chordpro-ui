import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { diffOps, overlayKey, parse } from '../../src/core'
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

async function frames() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
  await flushPromises()
}

describe('chart switch is not a song change', () => {
  it('does not call setlist go and leaves songId on the same item', async () => {
    const other = loadFixture('sda/084-escuta-meu-clamor.cho')
    const w = await mountViewer({
      source: '',
      songs: [
        { id: 'uma', title: 'Uma', source: TWO_CHART_SOURCE },
        { id: 'escuta', title: 'Escuta meu clamor', source: other },
      ],
    })
    expect(w.get('[data-setlist-open]').text()).toMatch(/1\/2/)
    expect(w.get('[data-chart-title]').text()).toMatch(/Uma/)
    await pickChart(w, 'completa')
    expect(w.get('[data-setlist-open]').text()).toMatch(/1\/2/)
    expect(w.get('[data-chart-title]').text()).toMatch(/Uma/)
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.find('[data-chart-switch]').exists()).toBe(true)

    await w.get('[data-song-next]').trigger('click')
    await flushPromises()
    expect(w.get('[data-setlist-open]').text()).toMatch(/2\/2/)
    expect(w.get('[data-chart-title]').text()).toMatch(/Escuta/i)
    expect(w.find('[data-chart-switch]').exists()).toBe(false)
  })

  it('keeps the sibling overlay in storage and reloads it on return', async () => {
    const oferta = parse(TWO_CHART_SOURCE, { chartId: 'oferta' }).source
    const mine = oferta.replace('[C]corpo da oferta', '[C]corpo da oferta (meu)')
    const ops = diffOps(oferta, mine, { transpose: 0, capo: 0 })
    const seeded = JSON.stringify({ baseVersion: 'v1', ops, at: 1 })
    localStorage.setItem(overlayKey('uma', 'oferta'), seeded)

    const w = await mountViewer()
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da oferta (meu)')
    await pickChart(w, 'completa')
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('(meu)')
    expect(localStorage.getItem(overlayKey('uma', 'oferta'))).toBe(seeded)
    expect(localStorage.getItem(overlayKey('uma', 'completa'))).toBeNull()

    await pickChart(w, 'oferta')
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da oferta (meu)')
    expect(localStorage.getItem(overlayKey('uma', 'oferta'))).toBe(seeded)
  })

  it('restores live transpose, capo, speed and scroll per chartId', async () => {
    const w = await mountViewer()
    const el = w.get('[data-cpv-scroll]').element as HTMLElement
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 4000 })
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: 500 })
    observers.forEach((cb) => cb([{ contentRect: { width: 800, height: 800 } }]))
    await flushPromises()

    expect(w.get('[data-display-key]').text()).toBe('C')
    await w.get('[data-transpose-up]').trigger('click')
    await flushPromises()
    expect(w.get('[data-display-key]').text()).toBe('C#')
    await w.get('[data-capo]').trigger('click')
    await flushPromises()
    await w.get('[aria-label="Capo acima"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-capo]').text()).toMatch(/1/)
    el.scrollTop = 180

    await w.get('[data-met-btn]').trigger('click')
    await flushPromises()
    await w.get('[data-met-follow]').trigger('click')
    await flushPromises()
    await w.get('[aria-label="Fechar"]').trigger('click')
    await flushPromises()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    await w.get('[aria-label="Mais rápido"]').trigger('click')
    await flushPromises()
    expect(w.text()).toMatch(/1\.12/)

    await pickChart(w, 'completa')
    expect(w.get('[data-display-key]').text()).toBe('G')
    expect(w.get('[data-capo]').text()).not.toMatch(/1/)
    expect(el.scrollTop).toBe(0)

    await pickChart(w, 'oferta')
    await frames()
    expect(w.get('[data-display-key]').text()).toBe('C#')
    expect(w.get('[data-capo]').text()).toMatch(/1/)
    expect(el.scrollTop).toBe(180)
    observers.forEach((cb) => cb([{ contentRect: { width: 800, height: 800 } }]))
    await flushPromises()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    expect(w.text()).toMatch(/1\.12/)
  })

  it('keeps metronome BPM per chart so oferta does not leak onto completa', async () => {
    const w = await mountViewer()
    await w.get('[data-met-btn]').trigger('click')
    await flushPromises()
    expect(w.get('[data-bpm]').text()).toBe('100')
    await w.get('[aria-label="+5 BPM"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-bpm]').text()).toBe('105')

    await pickChart(w, 'completa')
    expect(w.get('[data-bpm]').text()).toBe('100')

    await pickChart(w, 'oferta')
    expect(w.get('[data-bpm]').text()).toBe('105')
  })

  it('does not reset lens or hideComments on chart switch', async () => {
    const w = await mountViewer()
    await w.get('[data-reading=letra]').trigger('click')
    await flushPromises()
    await w.get('[data-comments-toggle]').trigger('click')
    await flushPromises()
    expect(w.get('[data-reading=letra]').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-comments-toggle]').attributes('aria-pressed')).toBe('true')

    await pickChart(w, 'completa')
    expect(w.get('[data-reading=letra]').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-comments-toggle]').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
  })
})
