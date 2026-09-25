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
