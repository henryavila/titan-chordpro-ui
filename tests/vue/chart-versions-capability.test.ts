import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TitanChordpro } from '../../src/vue'

const ONE_CHART = `{title:Uma}
{key:G}
{duration:03:00}
[G]corpo da cifra
`

const TWO_CHARTS = `{start_of_x_chart:completa}
{title:Uma}
{x_chart_label:Completa}
{key:G}
[G]corpo da completa
{end_of_x_chart}

{start_of_x_chart:oferta}
{title:Uma}
{x_chart_label:Oferta}
{x_chart_default:oferta}
{key:C}
[C]corpo da oferta
{end_of_x_chart}
`

class TestRO {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const mounted: ReturnType<typeof mount>[] = []
let realRO: typeof ResizeObserver

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('titan-chordpro:fitSeen', '1')
  realRO = globalThis.ResizeObserver
  globalThis.ResizeObserver = TestRO as unknown as typeof ResizeObserver
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  globalThis.ResizeObserver = realRO
  localStorage.clear()
})

async function editing(source: string, capabilities?: Record<string, boolean>) {
  const w = mount(TitanChordpro, {
    props: { source, theme: 'dark', autoHide: false, songId: 'uma', editMode: 'persisted', capabilities },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  await w.get('[data-edit]').trigger('click')
  await flushPromises()
  return w
}

const ACTIONS = ['[data-chart-add]', '[data-chart-rename]', '[data-chart-delete]', '[data-chart-default]']

describe('capabilities.chartVersions', () => {
  it('by default the editor offers Nova versão on a one-chart file', async () => {
    const w = await editing(ONE_CHART)
    await w.get('[data-chart-switch]').trigger('click')
    await flushPromises()
    expect(w.get('[data-chart-add]').text()).toMatch(/Nova versão/)
  })

  it('false hides the version chip on a one-chart file', async () => {
    const w = await editing(ONE_CHART, { chartVersions: false })
    expect(w.find('[data-chart-switch]').exists()).toBe(false)
    for (const action of ACTIONS) expect(w.find(action).exists(), action).toBe(false)
  })

  it('false still switches between the versions a file already has, without managing them', async () => {
    const w = await editing(TWO_CHARTS, { chartVersions: false })
    await w.get('[data-chart-switch]').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Completa')
    for (const action of ACTIONS) expect(w.find(action).exists(), action).toBe(false)
  })
})
