import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORE_KEYS } from '../../src/core'
import { TitanChordpro } from '../../src/vue'

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

const ONE_CHART_SOURCE = `{title:Uma}
{key:G}

[G]corpo único`

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
  localStorage.setItem(STORE_KEYS.fitSeen, '1')
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
  const w = mount(TitanChordpro, {
    props: {
      source: TWO_CHART_SOURCE,
      theme: 'dark',
      autoHide: false,
      songId: 'uma',
      editMode: 'persisted',
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

async function enterEdit(w: Awaited<ReturnType<typeof mountViewer>>) {
  await w.get('[data-edit]').trigger('click')
  await flushPromises()
}

async function openVersions(w: Awaited<ReturnType<typeof mountViewer>>) {
  await w.get('[data-chart-switch]').trigger('click')
  await flushPromises()
}

/** Records the two host props in emission order, which `emitted()` alone loses. */
function recordOrder() {
  const order: { event: string; value: string }[] = []
  return {
    order,
    props: {
      'onUpdate:source': (value: string) => order.push({ event: 'update:source', value }),
      'onUpdate:chartId': (value: string) => order.push({ event: 'update:chartId', value }),
    },
  }
}

async function createVersion(w: Awaited<ReturnType<typeof mountViewer>>, label: string) {
  await openVersions(w)
  await w.get('[data-chart-add]').trigger('click')
  await flushPromises()
  await w.get('[data-chart-label]').setValue(label)
  await w.get('[data-chart-add-go]').trigger('click')
  await flushPromises()
}

describe('update:chartId follows the version on screen', () => {
  it('emits once with the created version', async () => {
    const w = await mountViewer()
    await enterEdit(w)
    await createVersion(w, 'Louvor')

    expect(w.emitted('update:chartId')?.flat()).toEqual(['louvor'])
    expect(w.get('[data-chart-switch]').text()).toMatch(/Louvor/)
  })

  it('sends the file with the new version before announcing its chart id', async () => {
    const { order, props } = recordOrder()
    const w = await mountViewer(props)
    await enterEdit(w)
    order.length = 0
    await createVersion(w, 'Louvor')

    expect(order.map((e) => e.event)).toEqual(['update:source', 'update:chartId'])
    expect(order[0]?.value).toContain('{x_chart_label:Louvor}')
    expect(order[1]?.value).toBe('louvor')
  })

  it('sends the file with the removed version before announcing the remaining chart id', async () => {
    const { order, props } = recordOrder()
    const w = await mountViewer(props)
    await enterEdit(w)
    await openVersions(w)
    order.length = 0
    await w.get('[data-chart-delete]').trigger('click')
    await flushPromises()
    await w.get('[data-chart-delete]').trigger('click')
    await flushPromises()

    expect(order.map((e) => e.event)).toEqual(['update:source', 'update:chartId'])
    expect(order[0]?.value).not.toContain('{x_chart_label:Oferta}')
    expect(order[1]?.value).toBe('completa')
  })

  it('emits when the first version is created on a file with no envelope', async () => {
    const w = await mountViewer({ source: ONE_CHART_SOURCE })
    await enterEdit(w)
    await createVersion(w, 'Louvor')

    expect(w.emitted('update:chartId')?.flat()).toEqual(['louvor'])
    expect(w.get('[data-chart-switch]').text()).toMatch(/Louvor/)
  })

  it('emits once with the version left on screen after a delete', async () => {
    const w = await mountViewer()
    await enterEdit(w)
    await openVersions(w)
    await w.get('[data-chart-delete]').trigger('click')
    await flushPromises()
    await w.get('[data-chart-delete]').trigger('click')
    await flushPromises()

    expect(w.emitted('update:chartId')?.flat()).toEqual(['completa'])
    expect(w.get('[data-chart-switch]').text()).toMatch(/Completa/)
  })

  it('does not emit on rename', async () => {
    const w = await mountViewer({ chartId: 'completa' })
    await enterEdit(w)
    await openVersions(w)
    await w.get('[data-chart-rename]').trigger('click')
    await flushPromises()
    await w.get('[data-chart-rename-input]').setValue('Completa curta')
    await w.get('[data-chart-rename-go]').trigger('click')
    await flushPromises()

    expect(w.emitted('update:chartId')).toBeUndefined()
  })

  it('does not emit on set default', async () => {
    const w = await mountViewer({ chartId: 'completa' })
    await enterEdit(w)
    await openVersions(w)
    await w.get('[data-chart-default]').trigger('click')
    await flushPromises()

    expect(w.emitted('update:chartId')).toBeUndefined()
  })

  it('still emits once when the musician picks a version on the chip', async () => {
    const w = await mountViewer()
    await openVersions(w)
    await w.get('[data-chart-option="completa"]').trigger('click')
    await flushPromises()

    expect(w.emitted('update:chartId')?.flat()).toEqual(['completa'])
  })

  it('keeps the created version when the programmed chartId comes back unchanged', async () => {
    const w = await mountViewer({ chartId: 'completa' })
    await enterEdit(w)
    await createVersion(w, 'Louvor')
    expect(w.get('[data-chart-switch]').text()).toMatch(/Louvor/)

    await w.setProps({ songId: 'outra' })
    await flushPromises()
    await w.setProps({ songId: 'uma' })
    await flushPromises()

    expect(w.get('[data-chart-switch]').text()).toMatch(/Louvor/)
  })
})
