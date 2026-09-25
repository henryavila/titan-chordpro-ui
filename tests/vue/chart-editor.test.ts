import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue'

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

async function editLyric(w: Awaited<ReturnType<typeof mountViewer>>, from: string, to: string) {
  const row = w.findAll('[data-row]').find((r) => r.text().includes(from.replace(/\[[^\]]*\]/g, '')))
  expect(row, `row for ${from}`).toBeTruthy()
  await row!.trigger('click')
  await flushPromises()
  const input = w.get('input[aria-label="Letra desta linha"]')
  await input.setValue(to)
  await input.trigger('blur')
  await flushPromises()
}

describe('session edits the chart document', () => {
  it('changing oferta lyric emits the full file with completa unchanged', async () => {
    const w = await mountViewer()
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da oferta')
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await editLyric(w, 'corpo da oferta', 'corpo da oferta nova')
    await w.get('[data-save]').trigger('click')
    await flushPromises()

    const saved = (w.emitted('update:source')?.at(-1)?.[0] ??
      w.emitted('save-content')?.at(-1)?.[0]) as string
    expect(saved).toContain('{start_of_x_chart:completa}')
    expect(saved).toContain('{start_of_x_chart:oferta}')
    expect(saved).toContain('corpo da oferta nova')
    expect(saved).toContain('[G]corpo da completa')
    expect(saved).not.toContain('corpo da oferta\n')
    expect(w.emitted('save-content')?.at(-1)?.[0] ?? saved).toContain('{start_of_x_chart:completa}')
  })

  it('edits the chartId that is open, not the file default', async () => {
    const w = await mountViewer({ chartId: 'completa' })
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
    await w.get('[data-source]').trigger('click')
    await flushPromises()
    const shown = String((w.get('textarea[aria-label="Fonte ChordPro"]').element as HTMLTextAreaElement).value)
    expect(shown).toContain('corpo da completa')
    expect(shown).not.toContain('corpo da oferta')
    await w.get('[aria-label="Fechar painel de source"]').trigger('click')
    await flushPromises()
    await editLyric(w, 'corpo da completa', 'corpo da completa nova')
    await w.get('[data-save]').trigger('click')
    await flushPromises()

    const saved = (w.emitted('update:source')?.at(-1)?.[0] ??
      w.emitted('save-content')?.at(-1)?.[0]) as string
    expect(saved).toContain('corpo da completa nova')
    expect(saved).toContain('[C]corpo da oferta')
    expect(saved).not.toMatch(/corpo da completa\n/)
  })
})

describe('add rename delete default in edit', () => {
  it('adds a cifra from the open chart and keeps the sibling', async () => {
    const w = await mountViewer()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(w.get('[data-chart-add]').text()).toMatch(/Adicionar cifra/)
    await w.get('[data-chart-add]').trigger('click')
    await flushPromises()
    await w.get('[data-chart-id]').setValue('louvor')
    await w.get('[data-chart-label]').setValue('Louvor')
    await w.get('[data-chart-add-go]').trigger('click')
    await flushPromises()
    await w.get('[data-save]').trigger('click')
    await flushPromises()
    const saved = String(
      w.emitted('update:source')?.at(-1)?.[0] ?? (w.vm as { getSource: () => string }).getSource(),
    )
    expect(saved).toContain('{start_of_x_chart:louvor}')
    expect(saved).toContain('{x_chart_label:Louvor}')
    expect(saved).toContain('{start_of_x_chart:completa}')
    expect(saved).toContain('corpo da oferta')
  })

  it('renames the label without changing chartId', async () => {
    const w = await mountViewer()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-chart-rename]').trigger('click')
    await flushPromises()
    await w.get('[data-chart-rename-input]').setValue('Oferta curta')
    await w.get('[data-chart-rename-go]').trigger('click')
    await flushPromises()
    expect(w.get('[data-chart-edit-label]').text()).toBe('Oferta curta')
    await w.get('[data-save]').trigger('click')
    await flushPromises()
    const saved = String(
      w.emitted('update:source')?.at(-1)?.[0] ?? (w.vm as { getSource: () => string }).getSource(),
    )
    expect(saved).toContain('{start_of_x_chart:oferta}')
    expect(saved).toContain('{x_chart_label:Oferta curta}')
    expect(saved).toContain('{start_of_x_chart:completa}')
  })

  it('marks the open chart as default', async () => {
    const w = await mountViewer({ chartId: 'completa' })
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-chart-default]').trigger('click')
    await flushPromises()
    await w.get('[data-save]').trigger('click')
    await flushPromises()
    const saved = String(
      w.emitted('update:source')?.at(-1)?.[0] ?? (w.vm as { getSource: () => string }).getSource(),
    )
    expect(saved).toMatch(/start_of_x_chart:completa[\s\S]*x_chart_default:completa/)
  })

  it('deleting one of two remaining writes a one-chart file', async () => {
    const w = await mountViewer()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-chart-delete]').trigger('click')
    await flushPromises()
    await w.get('[data-save]').trigger('click')
    await flushPromises()
    const saved = String(
      w.emitted('update:source')?.at(-1)?.[0] ?? (w.vm as { getSource: () => string }).getSource(),
    )
    expect(saved).not.toMatch(/start_of_x_chart/)
    expect(saved).toContain('corpo da completa')
    expect(saved).not.toContain('corpo da oferta')
  })

  it('does not show chart management in view mode', async () => {
    const w = await mountViewer()
    expect(w.find('[data-chart-add]').exists()).toBe(false)
    expect(w.find('[data-chart-rename]').exists()).toBe(false)
    expect(w.find('[data-chart-delete]').exists()).toBe(false)
    expect(w.find('[data-chart-default]').exists()).toBe(false)
  })
})
