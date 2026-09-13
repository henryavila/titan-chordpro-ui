import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { memoryStore, readMeta } from '../../src/core'
import { ChordproViewer } from '../../src/vue'

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

const NO_STRUM = `{title:Teste}
{key:D}
{tempo:90}
{time:4/4}
{duration:04:00}
{c:Verso}
[D]Oi
`

const WITH_STRUM = `{title:Teste}
{key:D}
{tempo:71}
{time:4/4}
{duration:04:00}
{x_strum: bpm=71; meter=4/4; grid=8; label=Padrão; pat=DuDu DuDU}
{c:Verso}
[D]Oi
`

const LEGACY_REST = `{title:Teste}
{key:D}
{tempo:80}
{time:4/4}
{duration:04:00}
{x_strum:bpm=80; meter=4/4; grid=4; label=Old; pat=D-U-}
{c:Verso}
[D]Oi
`

async function viewerAt(source: string, width = 900) {
  const w = mount(ChordproViewer, {
    props: { source, storage: memoryStore(), autoHide: false, modes: 'content' },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width, height: 800 } }]))
  await flushPromises()
  return w
}

describe('Batida editor CTA + sheet', () => {
  it('shows + Criar batida without x_strum and opens BatidaSheet', async () => {
    const w = await viewerAt(NO_STRUM)
    const create = w.get('[data-batida-create]')
    expect(create.text()).toMatch(/Criar batida/i)
    expect(w.find('[data-batida-sheet]').exists()).toBe(false)
    await create.trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-sheet]').exists()).toBe(true)
  })

  it('lays out one beat per row on a narrow viewport', async () => {
    const w = await viewerAt(NO_STRUM, 390)
    await w.get('[data-batida-create]').trigger('click')
    await flushPromises()
    const rows = w.findAll('[data-batida-beat-row]')
    expect(rows.length).toBe(4)
    for (const row of rows) {
      expect(row.findAll('[data-batida-slot]')).toHaveLength(4)
    }
  })

  it('opens picker with 8 hit + 2 ghost and no pausa/rest', async () => {
    const w = await viewerAt(NO_STRUM)
    await w.get('[data-batida-create]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-slot="0"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-picker]').exists()).toBe(true)
    const choices = w.findAll('[data-batida-choice]')
    expect(choices).toHaveLength(10)
    expect(w.findAll('[data-batida-choice="hit"]')).toHaveLength(8)
    expect(w.findAll('[data-batida-choice="ghost"]')).toHaveLength(2)
    expect(w.text().toLowerCase()).not.toMatch(/pausa/)
    expect(w.find('[data-batida-choice="rest"]').exists()).toBe(false)
  })

  it('marks the current choice via slotEquals', async () => {
    const w = await viewerAt(WITH_STRUM)
    await w.get('[data-strum-btn]').trigger('click')
    await flushPromises()
    await w.get('[data-strum-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-slot="0"]').trigger('click')
    await flushPromises()
    const on = w.find('[data-batida-choice][aria-pressed="true"]')
    expect(on.exists()).toBe(true)
    expect(on.attributes('data-batida-choice')).toBe('hit')
  })

  it('save writes {x_strum:} via writeMeta and hasStrum becomes true', async () => {
    const w = await viewerAt(NO_STRUM)
    await w.get('[data-batida-create]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-slot="0"]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-choice="hit"]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-save]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-sheet]').exists()).toBe(false)
    expect(w.find('[data-batida-create]').exists()).toBe(false)
    expect(w.find('[data-strum-btn]').exists()).toBe(true)
    const src = (w.emitted('update:source')?.at(-1)?.[0] as string) ?? ''
    expect(readMeta(src).x_strum).toBeTruthy()
    expect(readMeta(src).x_strum).toContain('bpm=90')
    expect(readMeta(src).x_strum).not.toContain('-')
  })

  it('Apagar removes x_strum and restores + Criar', async () => {
    const w = await viewerAt(WITH_STRUM)
    await w.get('[data-strum-btn]').trigger('click')
    await flushPromises()
    await w.get('[data-strum-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-delete]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-create]').exists()).toBe(true)
    expect(w.find('[data-strum-btn]').exists()).toBe(false)
    const src = (w.emitted('update:source')?.at(-1)?.[0] as string) ?? ''
    expect(readMeta(src).x_strum).toBeUndefined()
  })

  it('legacy pat - displays/edits as passa and save does not write new -', async () => {
    const w = await viewerAt(LEGACY_REST)
    await w.get('[data-strum-btn]').trigger('click')
    await flushPromises()
    await w.get('[data-strum-edit]').trigger('click')
    await flushPromises()
    const slot1 = w.get('[data-batida-slot="1"]')
    expect(slot1.text().toLowerCase()).toMatch(/passa/)
    expect(slot1.text().toLowerCase()).not.toMatch(/pausa/)
    await w.get('[data-batida-save]').trigger('click')
    await flushPromises()
    const src = (w.emitted('update:source')?.at(-1)?.[0] as string) ?? ''
    const raw = readMeta(src).x_strum ?? ''
    expect(raw).toBeTruthy()
    expect(raw).not.toContain('-')
    expect(raw).toMatch(/[du]/i)
  })

  it('create path mirrors {tempo:} into pattern bpm', async () => {
    const w = await viewerAt(NO_STRUM)
    await w.get('[data-batida-create]').trigger('click')
    await flushPromises()
    expect(w.get('[data-batida-sheet]').text()).toMatch(/90/)
    await w.get('[data-batida-save]').trigger('click')
    await flushPromises()
    const src = (w.emitted('update:source')?.at(-1)?.[0] as string) ?? ''
    expect(readMeta(src).x_strum).toContain('bpm=90')
  })

  it('strip stays hidden in chart edit mode; chrome still opens sheet', async () => {
    const w = await viewerAt(WITH_STRUM)
    await w.get('[data-strum-btn]').trigger('click')
    await flushPromises()
    expect(w.find('[data-strum-strip]').exists()).toBe(true)
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(w.find('[data-strum-strip]').exists()).toBe(false)
    expect(w.find('[data-strum-edit]').exists()).toBe(false)
  })
})
